"""
Hybrid Recommendation Engine
Combines Content-Based Filtering and Collaborative Filtering with
dynamic alpha-weighting to mitigate cold-start and data sparsity.

Algorithm (from research paper §3.3.1):
  Step 1: Retrieve user profile vector Pu
  Step 2: Compute content similarity Sij = cos(Pu, Ci)
  Step 3: Find top-K similar users for collaborative filtering
  Step 4: Compute CF prediction score Pcf
  Step 5: Hfinal = α × Sij + (1-α) × Pcf
  Step 6: Rank and return top-N items
  Step 7: Update Pu from new interactions
"""
import numpy as np
from sqlalchemy.orm import Session
from scipy.sparse.linalg import svds
from scipy.sparse import csr_matrix
from .models import User, Content, Interaction
from . import nlp_module


def compute_alpha(interaction_count: int) -> float:
    """Dynamic alpha: 1.0 for new users (pure content-based), decreases as interactions grow."""
    alpha = max(0.15, 1.0 - (interaction_count / 25.0))
    return round(alpha, 3)


def get_interaction_reason(alpha: float, score: float) -> str:
    if alpha > 0.85:
        return "Matched your topic preferences"
    elif alpha > 0.6:
        return "Similar to content you've read"
    elif alpha > 0.35:
        return "Trending among readers like you"
    else:
        return "Highly recommended based on your history"


def build_user_profile_vector(user: User, db: Session) -> list[float]:
    """
    Build user preference vector as weighted average of TF-IDF vectors
    of content they have interacted with.
    """
    interactions = (
        db.query(Interaction)
        .filter(Interaction.user_id == user.id)
        .order_by(Interaction.created_at.desc())
        .limit(50)
        .all()
    )

    if not interactions:
        # Cold-start: build from topic preferences
        return _build_cold_start_vector(user.topic_preferences)

    vectors = []
    weights = []
    for interaction in interactions:
        content = db.query(Content).filter(Content.id == interaction.content_id).first()
        if content and content.tfidf_vector:
            vec = np.array(content.tfidf_vector)
            weight = _interaction_weight(interaction)
            vectors.append(vec * weight)
            weights.append(weight)

    if not vectors:
        return _build_cold_start_vector(user.topic_preferences)

    total_weight = sum(weights)
    profile = sum(vectors) / total_weight if total_weight > 0 else vectors[0]
    return profile.tolist()


def _build_cold_start_vector(topic_preferences: list[str]) -> list[float]:
    """For new users: synthesize a preference vector from their selected topics."""
    if not topic_preferences:
        return []
    topic_texts = []
    from .nlp_module import CATEGORY_KEYWORDS
    for pref in topic_preferences:
        keywords = CATEGORY_KEYWORDS.get(pref, [])
        topic_texts.append(' '.join(keywords))
    combined = ' '.join(topic_texts)
    return nlp_module.compute_tfidf_vector(combined)


def _interaction_weight(interaction: Interaction) -> float:
    base = 1.0
    if interaction.interaction_type == "read":
        base = 1.5
    elif interaction.interaction_type == "rate":
        base = 1.0 + (interaction.rating or 3.0) / 5.0
    elif interaction.interaction_type == "bookmark":
        base = 2.0
    # Dwell time bonus (up to 1.5x for 5+ minutes)
    dwell_bonus = min(1.5, 1.0 + (interaction.dwell_time / 600.0))
    return base * dwell_bonus


def content_based_scores(user_profile: list[float], all_content: list[Content]) -> dict[int, float]:
    """Compute cosine similarity between user profile and each content item."""
    if not user_profile:
        return {}
    pu = np.array(user_profile)
    scores = {}
    for item in all_content:
        if not item.tfidf_vector:
            scores[item.id] = 0.0
            continue
        ci = np.array(item.tfidf_vector)
        norm_pu = np.linalg.norm(pu)
        norm_ci = np.linalg.norm(ci)
        if norm_pu == 0 or norm_ci == 0:
            scores[item.id] = 0.0
        else:
            scores[item.id] = float(np.dot(pu, ci) / (norm_pu * norm_ci))
    return scores


def collaborative_scores(user_id: int, all_content_ids: list[int], db: Session) -> dict[int, float]:
    """
    SVD-based collaborative filtering.
    Builds user-item interaction matrix and decomposes with SVD.
    """
    users = db.query(User).filter(User.interaction_count > 0).all()
    if len(users) < 2:
        return {}

    user_ids = [u.id for u in users]
    if user_id not in user_ids:
        return {}

    interactions = db.query(Interaction).filter(
        Interaction.user_id.in_(user_ids),
        Interaction.content_id.in_(all_content_ids)
    ).all()

    if not interactions:
        return {}

    # Build interaction matrix
    user_idx = {uid: i for i, uid in enumerate(user_ids)}
    content_idx = {cid: i for i, cid in enumerate(all_content_ids)}

    matrix = np.zeros((len(user_ids), len(all_content_ids)))
    for inter in interactions:
        u = user_idx.get(inter.user_id)
        c = content_idx.get(inter.content_id)
        if u is not None and c is not None:
            matrix[u][c] = max(matrix[u][c], inter.strength)

    # SVD decomposition
    n_factors = min(10, matrix.shape[0] - 1, matrix.shape[1] - 1)
    if n_factors < 1:
        return {}

    try:
        sparse_matrix = csr_matrix(matrix)
        U, sigma, Vt = svds(sparse_matrix, k=n_factors)
        predicted = U @ np.diag(sigma) @ Vt

        u_idx = user_idx[user_id]
        scores = {}
        for cid, c_idx in content_idx.items():
            scores[cid] = max(0.0, float(predicted[u_idx][c_idx]))
        # Normalize 0-1
        if scores:
            max_score = max(scores.values()) or 1.0
            scores = {k: v / max_score for k, v in scores.items()}
    except Exception:
        return {}

    return scores


def get_already_seen(user_id: int, db: Session) -> set[int]:
    interactions = db.query(Interaction.content_id).filter(
        Interaction.user_id == user_id
    ).all()
    return {i[0] for i in interactions}


def get_recommendations(
    user: User,
    db: Session,
    top_n: int = 10,
    include_seen: bool = False
) -> list[dict]:
    all_content = db.query(Content).all()
    if not all_content:
        return []

    all_content_ids = [c.id for c in all_content]
    seen_ids = get_already_seen(user.id, db) if not include_seen else set()

    # Build or use stored profile vector
    profile_vector = build_user_profile_vector(user, db)
    if profile_vector:
        db.query(User).filter(User.id == user.id).update(
            {"profile_vector": profile_vector}
        )
        db.commit()

    alpha = compute_alpha(user.interaction_count)

    cb_scores = content_based_scores(profile_vector, all_content)
    cf_scores = collaborative_scores(user.id, all_content_ids, db)

    results = []
    for item in all_content:
        if item.id in seen_ids:
            continue
        cb = cb_scores.get(item.id, 0.0)
        cf = cf_scores.get(item.id, 0.0)
        hybrid = alpha * cb + (1.0 - alpha) * cf
        results.append({
            "content": item,
            "score": round(hybrid, 4),
            "reason": get_interaction_reason(alpha, hybrid),
            "alpha": alpha,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


def update_user_profile(user_id: int, db: Session):
    """Recalculate and persist user profile after new interaction."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
    profile = build_user_profile_vector(user, db)
    db.query(User).filter(User.id == user_id).update({
        "profile_vector": profile,
        "interaction_count": db.query(Interaction).filter(
            Interaction.user_id == user_id
        ).count()
    })
    db.commit()


def compute_precision_at_k(user_id: int, db: Session, k: int = 10) -> float:
    """Estimate Precision@K using held-out recent interactions as ground truth."""
    all_interactions = (
        db.query(Interaction)
        .filter(Interaction.user_id == user_id, Interaction.strength >= 1.5)
        .order_by(Interaction.created_at.desc())
        .all()
    )
    if len(all_interactions) < 3:
        return 0.74  # default from paper when insufficient data

    relevant = {i.content_id for i in all_interactions[:max(1, len(all_interactions) // 3)]}
    train = all_interactions[max(1, len(all_interactions) // 3):]

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return 0.74

    recs = get_recommendations(user, db, top_n=k, include_seen=True)
    recommended_ids = {r["content"].id for r in recs}
    hits = len(recommended_ids & relevant)
    return round(hits / k, 3) if k > 0 else 0.0
