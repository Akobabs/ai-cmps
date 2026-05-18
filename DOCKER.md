# Docker Setup — AI-CMPS

Complete guide for running AI-CMPS in Docker.

---

## Requirements

- Docker Desktop 4.x or later
- Docker Compose v2 (bundled with Docker Desktop)
- 2 GB free disk space (images + database volume)

---

## Quick Start

```powershell
docker compose up --build
```

| Service | URL |
|---------|-----|
| Application | http://localhost |
| API (direct) | http://localhost:8000 |
| Swagger docs | http://localhost:8000/docs |

The backend seeds the database automatically on first run. The frontend only starts after the backend passes its health check.

---

## Architecture

```
┌──────────────────────────────────────────────┐
│  Host machine                                 │
│                                              │
│  :80  ──────► aicmps-frontend (nginx:alpine) │
│                      │                       │
│                      │ proxy /api/ →          │
│                      ▼                       │
│  :8000 ─────► aicmps-backend (python:3.12)  │
│                      │                       │
│                      │ sqlite:////data/       │
│                      ▼                       │
│              db_data (Docker volume)         │
└──────────────────────────────────────────────┘
```

### Services

| Container | Base image | Role |
|-----------|-----------|------|
| `aicmps-backend` | `python:3.12-slim` | FastAPI + ML engine |
| `aicmps-frontend` | `nginx:alpine` | Serve React build + proxy API |

### Ports

| Host port | Container | Purpose |
|-----------|-----------|---------|
| `80` | aicmps-frontend:80 | Main application |
| `8000` | aicmps-backend:8000 | Direct API access (docs, testing) |

### Volume

| Volume | Mount point | Contents |
|--------|------------|---------|
| `ai_cmps_db_data` | `/data` (backend) | SQLite database file `ai_cmps.db` |

---

## Build Details

### Backend build (`backend/Dockerfile`)

1. `python:3.12-slim` base
2. Install `gcc` for any native extensions
3. `pip install -r requirements.txt` (pinned versions)
4. Copy `app/` source
5. Copy `entrypoint.sh`

**Entrypoint logic (`entrypoint.sh`):**
```sh
if [ ! -f /data/ai_cmps.db ]; then
    python -m app.seed_data   # seed only on first boot
fi
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend build (`frontend/Dockerfile`)

Two-stage build:
1. `node:20-alpine` — runs `npm ci` then `npm run build`
2. `nginx:alpine` — copies `dist/` and custom `nginx.conf`

**nginx proxy rule:**
```nginx
location /api/ {
    proxy_pass http://backend:8000;
}
```

All other requests fall back to `index.html` for SPA routing.

---

## Common Commands

### Start (build images if needed)
```powershell
docker compose up --build
```

### Start in background
```powershell
docker compose up --build -d
```

### View live logs
```powershell
docker compose logs -f
```

### View backend logs only
```powershell
docker compose logs -f backend
```

### Stop containers (keep database)
```powershell
docker compose down
```

### Stop and delete database volume (full reset)
```powershell
docker compose down -v
```

### Rebuild a single service
```powershell
docker compose build backend
docker compose up -d backend
```

### Open a shell in the backend container
```powershell
docker exec -it aicmps-backend sh
```

---

## Environment Variables

### Backend

| Variable | Default (Docker) | Description |
|----------|-----------------|-------------|
| `DATABASE_URL` | `sqlite:////data/ai_cmps.db` | SQLAlchemy connection string |

The double slash after `sqlite:` is correct — four slashes total for an absolute path inside the container.

To override, add to `docker-compose.yml` under `backend.environment`:
```yaml
environment:
  - DATABASE_URL=sqlite:////data/ai_cmps.db
  - SECRET_KEY=your-production-secret
```

---

## Health Check

The backend health check prevents the frontend from starting before the API is ready:

```yaml
healthcheck:
  test: ["CMD", "python", "-c",
    "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
  interval: 15s
  timeout: 5s
  retries: 5
  start_period: 30s
```

On first boot the seed script runs (takes ~5–10 seconds), so `start_period: 30s` gives the backend time before health checks begin.

Check container health status:
```powershell
docker ps
```

Look for `(healthy)` in the STATUS column for `aicmps-backend`.

---

## Troubleshooting

### Frontend shows 502 Bad Gateway

The backend is still starting or seeding. Wait 20–30 seconds and refresh. If it persists:
```powershell
docker compose logs backend
```

### Port 80 already in use

Another process is bound to port 80 (IIS, another nginx, etc.). Either stop the conflicting process or change the host port in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"   # change 80 to any free port
```

Then access the app at http://localhost:8080.

### Port 8000 already in use

```yaml
ports:
  - "8001:8000"
```

API docs would then be at http://localhost:8001/docs.

### Database is empty / seed didn't run

The entrypoint only seeds when `/data/ai_cmps.db` does not exist. If the file exists but is empty (interrupted first run), do a full reset:
```powershell
docker compose down -v
docker compose up --build
```

### Inspect the SQLite database

```powershell
docker exec -it aicmps-backend python -c "
from app.database import SessionLocal
from app import models
db = SessionLocal()
print('Users:', db.query(models.User).count())
print('Content:', db.query(models.Content).count())
print('Interactions:', db.query(models.Interaction).count())
db.close()
"
```

### Rebuild after code changes

```powershell
docker compose down
docker compose up --build
```

Images are layer-cached — only changed layers rebuild.

---

## Data Persistence

The SQLite database lives in the `ai_cmps_db_data` Docker volume. It survives:
- `docker compose down` (no `-v` flag)
- `docker compose restart`
- Container crashes and restarts

It is deleted by:
- `docker compose down -v`
- `docker volume rm ai_cmps_db_data`

To back up the database:
```powershell
docker cp aicmps-backend:/data/ai_cmps.db ./backup_ai_cmps.db
```

To restore:
```powershell
docker cp ./backup_ai_cmps.db aicmps-backend:/data/ai_cmps.db
```
