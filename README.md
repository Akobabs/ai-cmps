# AI-CMPS — AI-Powered Content Management & Personalization System

A functional MVP demonstrating the research system described in:
**"Development of an AI-Powered Content Management and Personalization System"**

---

## Quick Start

Open **two terminals** from this folder:

**Terminal 1 — Backend:**
```powershell
.\venv\Scripts\python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Demo Accounts

| Account | Email | Password | Profile |
|---------|-------|----------|---------|
| Alice | alice@aicmps.demo | alice123 | AI & Web Dev enthusiast (12 interactions) |
| Bob | bob@aicmps.demo | bob123 | Web Dev & Business focus (11 interactions) |
| Carol | carol@aicmps.demo | carol123 | Business & Finance (11 interactions) |
| Dave | dave@aicmps.demo | dave123 | Health & Education (10 interactions) |
| **Admin** | admin@aicmps.demo | admin123 | Access to Admin Panel + Analytics |

---

## System Architecture

```
5 Integrated Modules (from research §3.3.1):

Module 1: Data Collection & Preprocessing
  → Captures explicit (preferences) and implicit (dwell time, clicks) data

Module 2: NLP & Content Analysis
  → TF-IDF vectorization with bigram support
  → Auto category classification
  → Sentiment analysis
  → Keyword extraction

Module 3: Dynamic User Profiling
  → Weighted average of TF-IDF vectors from interaction history
  → Real-time update on every interaction

Module 4: Hybrid Recommendation Engine
  → Content-based: cosine similarity between user profile and content vectors
  → Collaborative: SVD matrix factorization on user-item interaction matrix
  → Hybrid: H = α × S_cb + (1-α) × S_cf
  → Dynamic α: starts at 1.0 (new user), decreases to 0.15 as interactions grow

Module 5: Personalized Delivery & Feedback Loop
  → Ranked recommendations with explanation
  → Feedback captured and profile updated immediately
```

---

## Key Metrics (from research evaluation)

| Metric | Value |
|--------|-------|
| Precision@10 | 0.74 |
| Recall@10 | 0.68 |
| Session Duration Improvement | +81% |
| Content Consumption Rate | +104% |
| Avg API Latency | 187ms |

---

## Demo Features to Show

1. **Cold-Start Handling** — Register a new user, select topic preferences → instant personalized feed
2. **Alpha Indicator** — Home page shows current α value and recommendation mode (Content-Based → Hybrid → Collaborative)
3. **NLP Auto-Tagging** — Admin panel: add a new article and preview auto-extracted tags + category
4. **Behavioral Tracking** — Read an article, rate it, bookmark it → watch profile update on /profile page
5. **Collaborative Filtering** — Login as Alice (AI-focused) vs Carol (Business-focused) → different recommendations
6. **Analytics Dashboard** — /analytics shows Precision@10=0.74, engagement trend, category distribution

---

## API Documentation

Interactive API docs at: **http://localhost:8000/docs**
