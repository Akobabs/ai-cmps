#!/bin/sh
set -e

echo "==> Checking database..."
if [ ! -f /data/ai_cmps.db ]; then
    echo "==> Seeding database for first run..."
    python -m app.seed_data
else
    echo "==> Database exists, skipping seed."
fi

echo "==> Starting AI-CMPS backend..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
