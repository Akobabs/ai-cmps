# Backend — AI-CMPS

FastAPI backend implementing the hybrid recommendation engine, NLP pipeline, and REST API.

---

## Table of Contents

- [Local Setup](#local-setup)
- [Project Structure](#project-structure)
- [Modules](#modules)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Recommendation Algorithm](#recommendation-algorithm)
- [NLP Pipeline](#nlp-pipeline)
- [Authentication](#authentication)
- [Configuration](#configuration)
- [Dependencies](#dependencies)

---

## Local Setup

### Prerequisites

- Python 3.12+
- A virtual environment (recommended)

### Install

```powershell
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
```

### Run

From the project root (one level above `backend/`):

```powershell
.\venv\Scripts\python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

The database is created and seeded automatically at `./ai_cmps.db` on first run.

### Seed manually

```powershell
.\venv\Scripts\python -m backend.app.seed_data
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI application, all API routes, startup event
│   ├── models.py        # SQLAlchemy ORM models
│   ├── database.py      # Engine, SessionLocal, Base, get_db dependency
│   ├── auth.py          # JWT tokens, password hashing, current_user dependency
│   ├── nlp_module.py    # TF-IDF vectorizer, NLP analysis functions
│   ├── recommender.py   # Hybrid engine, alpha, content-based, collaborative
│   └── seed_data.py     # Demo users, articles, and interactions
├── requirements.txt
├── Dockerfile
└── entrypoint.sh
```

---

## Modules

### `database.py`

Sets up the SQLAlchemy engine from the `DATABASE_URL` environment variable (falls back to `sqlite:///./ai_cmps.db` for local development).

```python
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./ai_cmps.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
```

Exports: `engine`, `SessionLocal`, `Base`, `get_db` (FastAPI dependency).

---

### `models.py`

Three SQLAlchemy models mapping to SQLite tables.

**User**

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| email | String, unique | |
| username | String, unique | |
| hashed_password | String | `salt:sha256hash` |
| is_admin | Boolean | default False |
| topic_preferences | JSON | list of category strings |
| profile_vector | JSON | list of floats (TF-IDF, length 500) |
| interaction_count | Integer | updated on every interaction |
| created_at | DateTime | |

**Content**

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| title | String | |
| body | Text | |
| summary | String | first 200 chars of body |
| category | String | one of 6 categories |
| tags | JSON | list of keyword strings |
| tfidf_vector | JSON | list of floats (length 500) |
| sentiment_score | Float | -1.0 to 1.0 |
| reading_time | Integer | minutes |
| author | String | |
| published_at | DateTime | |
| view_count | Integer | |
| avg_rating | Float | |
| rating_count | Integer | |

**Interaction**

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | FK → User | |
| content_id | FK → Content | |
| interaction_type | String | `view`, `read`, `rate`, `bookmark` |
| dwell_time | Float | seconds on page |
| scroll_depth | Float | 0.0 to 1.0 |
| rating | Float | 1.0 to 5.0 (for `rate` type) |
| strength | Float | computed weight |
| created_at | DateTime | |

---

### `auth.py`

**Password hashing** — SHA-256 with a 32-byte random salt:
```
stored = f"{salt}:{sha256(salt + password)}"
```

**JWT** — HS256 tokens with 24-hour expiry. The `sub` claim is always stored as a string and converted back to int on decode.

Exports:
- `hash_password(plain)` → `str`
- `verify_password(plain, hashed)` → `bool`
- `create_access_token(data)` → JWT string
- `get_current_user` — FastAPI dependency, returns `User` ORM object
- `get_admin_user` — same but raises 403 if not admin

---

### `nlp_module.py`

Wraps a global `TfidfVectorizer` instance.

**Vectorizer configuration:**
```python
TfidfVectorizer(
    max_features=500,
    ngram_range=(1, 2),   # unigrams + bigrams
    min_df=1,
    stop_words='english'
)
```

**Key functions:**

| Function | Description |
|----------|-------------|
| `fit_vectorizer(texts, content_ids)` | Refit global vectorizer on new corpus |
| `compute_tfidf_vector(text)` | Transform single text → 500-dim float list |
| `analyze_content(title, body)` | Returns dict: tags, category, sentiment_score, reading_time, summary |
| `classify_category(text)` | Score text against 6 keyword sets → best match |
| `analyze_sentiment(text)` | Positive/negative word ratio → float in [-1, 1] |
| `extract_keywords(text, top_n=8)` | Top unigrams + boosted bigrams, stopword filtered |

**Categories:** Technology, Business, Science, Health, Education, Entertainment

**Startup behaviour:** `main.py` calls `_rebuild_vectorizer(db)` on startup, which refits the vectorizer on all stored content and updates all `tfidf_vector` columns to stay consistent with the current vocabulary.

---

### `recommender.py`

**Alpha computation:**
```python
def compute_alpha(interaction_count: int) -> float:
    return max(0.15, 1.0 - interaction_count / 25.0)
```

**User profile vector** — weighted average of TF-IDF vectors of interacted content:
```
profile = Σ(strength_i × tfidf_vector_i) / Σ(strength_i)
```

Falls back to `_build_cold_start_vector(topic_preferences)` when the user has no interactions.

**Cold-start vector** — joins keyword lists for selected categories, computes TF-IDF vector from the combined keyword string.

**Content-based score** — cosine similarity between user profile and each article's TF-IDF vector.

**Collaborative filtering** — builds a user × item interaction matrix, applies `scipy.sparse.linalg.svds` with `k = min(10, n_users-1, n_items-1)` latent factors, normalises predicted ratings to [0, 1].

**Hybrid score:**
```
H = α × S_cb + (1 - α) × S_cf
```

**Key functions:**

| Function | Description |
|----------|-------------|
| `get_recommendations(user, db, top_n, include_seen)` | Main entry point, returns list of `{content, score, reason, alpha}` |
| `update_user_profile(user_id, db)` | Recalculates and persists profile_vector + interaction_count |
| `compute_alpha(n)` | α schedule |
| `content_based_scores(profile, content_list)` | Dict of content_id → cosine similarity |
| `collaborative_scores(user_id, content_ids, db)` | Dict of content_id → normalised CF score |

---

### `seed_data.py`

Creates 5 demo users (including admin) and 42 articles across all 6 categories. Pre-seeds interaction histories to give each non-admin user a meaningful profile vector and varying α values.

Seeds only when the `User` table is empty — safe to call multiple times.

---

## API Reference

All routes are prefixed with `/api`.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Create account; returns JWT |
| POST | `/api/auth/login` | None | Email + password; returns JWT |
| GET | `/api/auth/me` | Bearer | Current user profile |

**Register body:**
```json
{
  "email": "user@example.com",
  "username": "alice",
  "password": "secret123",
  "topic_preferences": ["Technology", "Science"]
}
```

**Login body (form data):**
```
username=user@example.com&password=secret123
```

**Token response:**
```json
{ "access_token": "<jwt>", "token_type": "bearer" }
```

---

### Content

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/content` | Bearer | All articles (paginated: `skip`, `limit`) |
| GET | `/api/content/{id}` | Bearer | Single article; logs `view` interaction |
| POST | `/api/content` | Admin | Create article; triggers NLP + vectorizer refit |
| DELETE | `/api/content/{id}` | Admin | Delete article |
| POST | `/api/content/preview-nlp` | Admin | Preview NLP results without saving |

**Create article body:**
```json
{
  "title": "Article Title",
  "body": "Full article text...",
  "author": "Author Name"
}
```

**NLP preview response:**
```json
{
  "tags": ["machine learning", "neural networks"],
  "category": "Technology",
  "sentiment_score": 0.23,
  "reading_time": 4,
  "summary": "First 200 characters..."
}
```

---

### Recommendations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/recommendations` | Bearer | Personalised feed; query: `top_n` (default 10) |

**Response item:**
```json
{
  "content": { ...article fields... },
  "score": 0.847,
  "reason": "Matches your Technology interests",
  "alpha": 0.64
}
```

---

### Interactions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/interactions` | Bearer | Log an interaction; updates profile |
| GET | `/api/interactions/history` | Bearer | User's interaction history |

**Interaction body:**
```json
{
  "content_id": 5,
  "interaction_type": "read",
  "dwell_time": 240.5,
  "scroll_depth": 0.85,
  "rating": null
}
```

Interaction types: `view`, `read`, `rate`, `bookmark`

**Strength computation:**

| Type | Formula |
|------|---------|
| `view` | 1.0 |
| `read` | 1.5 + min(1.5, dwell_time / 300) |
| `rate` | rating / 5 × 2 |
| `bookmark` | 2.5 |

After each interaction the user's `profile_vector` and `interaction_count` are updated immediately.

---

### User Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/profile` | Bearer | Extended profile with alpha + top categories |
| PUT | `/api/users/preferences` | Bearer | Update topic preferences |

---

### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/analytics/overview` | Admin | System-wide stats |
| GET | `/api/analytics/engagement` | Admin | 7-day engagement trend |
| GET | `/api/analytics/categories` | Admin | Category distribution |
| GET | `/api/analytics/top-content` | Admin | Most-rated articles |

---

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/users` | Admin | All users with stats |

---

### Utility

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Liveness probe; returns `{"status": "ok"}` |

---

## Authentication

Requests to protected routes must include:
```
Authorization: Bearer <jwt_token>
```

Tokens expire after **24 hours**. The secret key is set in `auth.py` as `SECRET_KEY`. For production, move this to an environment variable.

---

## Configuration

| Variable | Default | Override |
|----------|---------|---------|
| `DATABASE_URL` | `sqlite:///./ai_cmps.db` | Environment variable |

In Docker, `DATABASE_URL=sqlite:////data/ai_cmps.db` points to the named volume.

---

## Dependencies

```
fastapi==0.136.1         # Web framework
uvicorn[standard]==0.47.0 # ASGI server
sqlalchemy==2.0.49       # ORM
scikit-learn==1.8.0      # TF-IDF vectorizer, cosine similarity
numpy==2.4.5             # Array operations
scipy==1.17.1            # SVD matrix factorization
python-jose[cryptography]==3.5.0  # JWT
python-multipart==0.0.28  # Form data parsing (OAuth2PasswordRequestForm)
```
