# AI-CMPS — AI-Powered Content Management & Personalization System

A functional MVP demonstrating the research system described in:
**"Development of an AI-Powered Content Management and Personalization System"**

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Demo Accounts](#demo-accounts)
- [System Architecture](#system-architecture)
- [Core Algorithm](#core-algorithm)
- [Key Metrics](#key-metrics)
- [Demo Walkthrough](#demo-walkthrough)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)

---

## Overview

AI-CMPS is a full-stack web application that demonstrates a research-grade hybrid recommendation engine. It combines content-based filtering (TF-IDF cosine similarity) and collaborative filtering (SVD matrix factorization) with a dynamic weighting scheme that gracefully handles cold-start scenarios.

The system:
- Automatically profiles users from their reading behaviour in real time
- Handles new users via topic-preference seeding (explicit cold-start mitigation)
- Extracts tags, categories, and sentiment from article text using NLP
- Transitions smoothly from pure content-based to collaborative recommendations as interaction data grows
- Provides an admin panel for content management with live NLP preview
- Shows an analytics dashboard with research evaluation metrics

---

## Quick Start

### Option A — Docker (recommended)

```powershell
docker compose up --build
```

| Service | URL |
|---------|-----|
| Main application | http://localhost |
| API docs (Swagger) | http://localhost:8000/docs |
| API docs (ReDoc) | http://localhost:8000/redoc |

The database is auto-seeded with 5 demo users and 42 articles on first run.

**Stop:**
```powershell
docker compose down
```

**Reset database (fresh seed):**
```powershell
docker compose down -v
docker compose up --build
```

### Option B — Local Development

Requires Python 3.12+ and Node.js 20+. See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for full setup.

**Terminal 1 — Backend:**
```powershell
.\venv\Scripts\python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Demo Accounts

| Account | Email | Password | Profile |
|---------|-------|----------|---------|
| Alice | alice@aicmps.demo | alice123 | AI & Web Dev enthusiast — 12 interactions |
| Bob | bob@aicmps.demo | bob123 | Web Dev & Business focus — 11 interactions |
| Carol | carol@aicmps.demo | carol123 | Business & Finance — 11 interactions |
| Dave | dave@aicmps.demo | dave123 | Health & Education — 10 interactions |
| **Admin** | admin@aicmps.demo | admin123 | Admin panel + analytics access |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser / Client                     │
│              React + Vite + Tailwind CSS                 │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (Vite proxy / nginx proxy)
┌──────────────────────▼──────────────────────────────────┐
│                   FastAPI Backend                         │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ NLP Module  │  │ Recommender  │  │  Auth (JWT)    │  │
│  │  TF-IDF     │  │ Hybrid Engine│  │  SHA-256+salt  │  │
│  │  Sentiment  │  │ CB + CF + α  │  │                │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │             SQLAlchemy ORM — SQLite                │  │
│  │         Users │ Content │ Interactions             │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 5 Integrated Modules (research §3.3.1)

| Module | Responsibility |
|--------|---------------|
| **1. Data Collection & Preprocessing** | Captures explicit preferences (registration) and implicit signals (dwell time, scroll depth, clicks) |
| **2. NLP & Content Analysis** | TF-IDF vectorization with bigrams, auto category classification, sentiment analysis, keyword extraction |
| **3. Dynamic User Profiling** | Weighted average of TF-IDF vectors from interaction history; real-time update on every interaction |
| **4. Hybrid Recommendation Engine** | Content-based cosine similarity + collaborative SVD; blended via dynamic α |
| **5. Personalized Delivery & Feedback Loop** | Ranked recommendations with explanation; feedback captured and profile updated immediately |

---

## Core Algorithm

### Hybrid Score Formula

```
H_final = α × S_cb + (1 - α) × S_cf
```

Where:
- `S_cb` — content-based score (cosine similarity of user profile vs article TF-IDF vector)
- `S_cf` — collaborative filtering score (SVD-based predicted rating, normalized 0–1)
- `α` — dynamic weight: `max(0.15, 1.0 - interaction_count / 25.0)`

### Alpha Transition

| Interactions | α value | Mode |
|-------------|---------|------|
| 0 | 1.00 | Pure Content-Based |
| 5 | 0.80 | Mostly Content-Based |
| 10 | 0.60 | Balanced |
| 15 | 0.40 | Mostly Collaborative |
| 20+ | 0.15–0.20 | Mostly Collaborative |
| 25+ | 0.15 | Minimum (floor) |

### Cold-Start Handling

New users select topic preferences at registration. The system synthesises an initial TF-IDF profile vector from category keyword lists, enabling meaningful recommendations from the first session without any interaction history.

### Interaction Strength Weights

| Event | Strength Calculation |
|-------|---------------------|
| View | 1.0 |
| Read | 1.5 + min(1.5, dwell_time / 300) |
| Rate | rating / 5 × 2 |
| Bookmark | 2.5 |

---

## Key Metrics

Evaluation results from the research paper:

| Metric | Value |
|--------|-------|
| Precision@10 | 0.74 |
| Recall@10 | 0.68 |
| Session Duration Improvement | +81% |
| Content Consumption Rate | +104% |
| Avg API Latency | 187ms |

---

## Demo Walkthrough

### 1. Cold-Start Handling
Register a new account → select 2–3 topic preferences → observe instant personalised feed despite zero interactions. The alpha indicator on the home page shows α = 1.00 (pure content-based).

### 2. Alpha Indicator
The home page header displays the current α value and recommendation mode label. Read several articles and refresh — watch α decrease toward 0.15 as collaborative signals build up.

### 3. NLP Auto-Tagging
Log in as admin → Admin Panel → add a new article → click **Preview NLP** to see auto-extracted tags, predicted category, sentiment score, and estimated reading time before saving.

### 4. Behavioural Tracking
Open any article — dwell time is tracked in the background. Rate it (1–5 stars) or bookmark it. Navigate to `/profile` and observe the profile completeness percentage and reading history updating.

### 5. Collaborative Filtering Contrast
Log in as Alice (AI & Web Dev focus) — note the recommendations. Log out, log in as Carol (Business & Finance) — observe entirely different recommendations from the same article pool.

### 6. Analytics Dashboard
Navigate to `/analytics` (or Admin Panel → Analytics). See the Precision@10 gauge, 7-day engagement trend (Recharts LineChart), category distribution (PieChart), and top content by ratings.

---

## Project Structure

```
ai-cmps/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, all API routes
│   │   ├── models.py        # SQLAlchemy models (User, Content, Interaction)
│   │   ├── database.py      # Engine, session, Base
│   │   ├── auth.py          # JWT creation/validation, password hashing
│   │   ├── nlp_module.py    # TF-IDF pipeline, NLP analysis
│   │   ├── recommender.py   # Hybrid engine, alpha computation
│   │   └── seed_data.py     # Demo data (42 articles, 5 users)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── entrypoint.sh
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js    # Axios instance, auth interceptors
│   │   ├── components/      # Navbar, ContentCard, etc.
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── pages/
│   │       ├── Home.jsx         # Feed + alpha indicator
│   │       ├── ContentDetail.jsx # Dwell tracking, rating, bookmark
│   │       ├── Register.jsx      # Topic preference selector
│   │       ├── Login.jsx
│   │       ├── Profile.jsx       # User stats, reading history
│   │       ├── Analytics.jsx     # Research metrics dashboard
│   │       └── AdminPanel.jsx    # Content management + NLP preview
│   ├── nginx.conf
│   ├── vite.config.js
│   └── Dockerfile
│
├── docker-compose.yml
├── README.md
├── DOCKER.md
└── start-backend.ps1
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI 0.136 |
| ORM | SQLAlchemy 2.0 |
| Database | SQLite (Docker: named volume) |
| ML / NLP | scikit-learn 1.8, scipy 1.17, numpy 2.4 |
| Authentication | python-jose (JWT HS256), hashlib SHA-256 |
| Frontend framework | React 18 + Vite |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Routing | React Router v6 |
| HTTP client | Axios |
| Icons | lucide-react |
| Web server | nginx:alpine (Docker) |
