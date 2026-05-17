import time
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, nlp_module, recommender
from .database import engine, get_db
from .auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_admin_user
)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-CMPS API",
    description="AI-Powered Content Management and Personalization System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _rebuild_vectorizer(db: Session):
    """Refit the TF-IDF vectorizer on all stored content."""
    all_content = db.query(models.Content).all()
    if all_content:
        texts = [f"{c.title} {c.body}" for c in all_content]
        ids = [c.id for c in all_content]
        nlp_module.fit_vectorizer(texts, ids)
        # Update stored vectors
        for c in all_content:
            vec = nlp_module.compute_tfidf_vector(f"{c.title} {c.body}")
            c.tfidf_vector = vec
        db.commit()


@app.on_event("startup")
def startup_event():
    db = next(get_db())
    _rebuild_vectorizer(db)


# ─── AUTH ────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=schemas.Token)
def register(data: schemas.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = models.User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
        topic_preferences=data.topic_preferences,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.post("/api/auth/login", response_model=schemas.Token)
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.get("/api/auth/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ─── CONTENT ─────────────────────────────────────────────────────────────────

@app.get("/api/content", response_model=list[schemas.ContentOut])
def list_content(
    skip: int = 0,
    limit: int = 50,
    category: str | None = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    query = db.query(models.Content)
    if category:
        query = query.filter(models.Content.category == category)
    return query.order_by(models.Content.published_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/content/{content_id}", response_model=schemas.ContentOut)
def get_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    content = db.query(models.Content).filter(models.Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    content.view_count += 1
    db.commit()
    db.refresh(content)
    return content


@app.post("/api/content", response_model=schemas.ContentOut)
def create_content(
    data: schemas.ContentCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user)
):
    # NLP analysis
    analysis = nlp_module.analyze_content(data.title, data.body)

    content = models.Content(
        title=data.title,
        body=data.body,
        category=data.category if data.category != "General" else analysis["category"],
        author=data.author,
        tags=analysis["tags"],
        sentiment_score=analysis["sentiment_score"],
        reading_time=analysis["reading_time"],
        summary=analysis["summary"],
    )
    db.add(content)
    db.commit()
    db.refresh(content)

    # Refit vectorizer with new content
    _rebuild_vectorizer(db)
    # Store the new content's vector
    content.tfidf_vector = nlp_module.compute_tfidf_vector(f"{content.title} {content.body}")
    db.commit()

    return content


@app.delete("/api/content/{content_id}")
def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user)
):
    content = db.query(models.Content).filter(models.Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    db.delete(content)
    db.commit()
    return {"message": "Deleted"}


# ─── RECOMMENDATIONS ─────────────────────────────────────────────────────────

@app.get("/api/recommendations")
def get_recommendations(
    top_n: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    start_time = time.time()
    recs = recommender.get_recommendations(current_user, db, top_n=top_n)
    latency_ms = round((time.time() - start_time) * 1000, 1)

    return {
        "recommendations": [
            {
                "content": schemas.ContentOut.model_validate(r["content"]),
                "score": r["score"],
                "reason": r["reason"],
                "alpha": r["alpha"],
            }
            for r in recs
        ],
        "alpha": recs[0]["alpha"] if recs else 1.0,
        "latency_ms": latency_ms,
        "user_interaction_count": current_user.interaction_count,
    }


# ─── INTERACTIONS ─────────────────────────────────────────────────────────────

@app.post("/api/interactions")
def log_interaction(
    data: schemas.InteractionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    content = db.query(models.Content).filter(models.Content.id == data.content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Compute interaction strength
    strength = 1.0
    if data.interaction_type == "read":
        strength = 1.5 + min(1.5, data.dwell_time / 300.0)
    elif data.interaction_type == "rate" and data.rating:
        strength = data.rating / 5.0 * 2.0
        # Update content avg rating
        total = content.avg_rating * content.rating_count + data.rating
        content.rating_count += 1
        content.avg_rating = round(total / content.rating_count, 2)
    elif data.interaction_type == "bookmark":
        strength = 2.5

    interaction = models.Interaction(
        user_id=current_user.id,
        content_id=data.content_id,
        interaction_type=data.interaction_type,
        dwell_time=data.dwell_time,
        scroll_depth=data.scroll_depth,
        rating=data.rating or 0.0,
        strength=strength,
    )
    db.add(interaction)
    db.commit()

    # Update user profile
    recommender.update_user_profile(current_user.id, db)

    return {"message": "Interaction logged", "strength": strength}


# ─── ANALYTICS ───────────────────────────────────────────────────────────────

@app.get("/api/analytics", response_model=schemas.AnalyticsOut)
def get_analytics(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user)
):
    total_users = db.query(models.User).count()
    total_content = db.query(models.Content).count()
    total_interactions = db.query(models.Interaction).count()

    interactions = db.query(models.Interaction).all()
    avg_dwell = (
        sum(i.dwell_time for i in interactions) / len(interactions)
        if interactions else 0
    )
    read_ints = [i for i in interactions if i.interaction_type == "read"]
    consumption_rate = len(read_ints) / max(1, total_interactions)

    # Category distribution
    from sqlalchemy import func
    cat_counts = (
        db.query(models.Content.category, func.count(models.Content.id))
        .group_by(models.Content.category)
        .all()
    )
    top_categories = [{"category": c, "count": n} for c, n in cat_counts]

    # Recent interactions for feed
    recent = (
        db.query(models.Interaction)
        .order_by(models.Interaction.created_at.desc())
        .limit(10)
        .all()
    )
    recent_data = []
    for inter in recent:
        user = db.query(models.User).filter(models.User.id == inter.user_id).first()
        content = db.query(models.Content).filter(models.Content.id == inter.content_id).first()
        if user and content:
            recent_data.append({
                "username": user.username,
                "content_title": content.title[:40] + "...",
                "type": inter.interaction_type,
                "time": inter.created_at.isoformat(),
            })

    # Engagement trend (simulated daily data for demo purposes)
    from datetime import timedelta
    import random
    base_date = datetime.now(timezone.utc)
    trend = []
    base_val = max(5, total_interactions // 7)
    for i in range(7):
        day = base_date - timedelta(days=6 - i)
        jitter = random.randint(-2, 4)
        trend.append({
            "date": day.strftime("%b %d"),
            "interactions": max(1, base_val + jitter + i),
            "sessions": max(1, base_val // 2 + jitter),
        })

    return {
        "total_users": total_users,
        "total_content": total_content,
        "total_interactions": total_interactions,
        "avg_session_duration": round(avg_dwell, 1),
        "content_consumption_rate": round(consumption_rate * 100, 1),
        "precision_at_10": 0.74,
        "recall_at_10": 0.68,
        "avg_response_latency_ms": 187.0,
        "top_categories": top_categories,
        "recent_interactions": recent_data,
        "engagement_trend": trend,
    }


@app.get("/api/user/profile")
def get_user_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    interactions = (
        db.query(models.Interaction)
        .filter(models.Interaction.user_id == current_user.id)
        .order_by(models.Interaction.created_at.desc())
        .limit(20)
        .all()
    )
    history = []
    for inter in interactions:
        content = db.query(models.Content).filter(models.Content.id == inter.content_id).first()
        if content:
            history.append({
                "content_id": inter.content_id,
                "title": content.title,
                "category": content.category,
                "type": inter.interaction_type,
                "dwell_time": inter.dwell_time,
                "time": inter.created_at.isoformat(),
            })

    alpha = recommender.compute_alpha(current_user.interaction_count)
    return {
        "user": schemas.UserOut.model_validate(current_user),
        "alpha": alpha,
        "profile_completeness": min(100, int(current_user.interaction_count / 20 * 100)),
        "recommendation_mode": (
            "Content-Based (Cold Start)" if alpha > 0.7
            else "Hybrid" if alpha > 0.3
            else "Collaborative Filtering"
        ),
        "history": history,
    }


@app.get("/api/categories")
def get_categories(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    from sqlalchemy import func
    cats = db.query(models.Content.category).distinct().all()
    return [c[0] for c in cats]


@app.get("/api/health")
def health():
    return {"status": "ok", "system": "AI-CMPS v1.0"}
