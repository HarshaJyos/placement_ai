#!/bin/sh
set -e

echo "→ Starting AI Service (FastAPI) in the background on localhost:8000..."
cd /app/ai-service
uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1 &

echo "→ Setting up SQLite database..."
mkdir -p /data/db
if [ ! -f "/data/db/prod.db" ]; then
  echo "→ Initializing SQLite database at /data/db/prod.db..."
  cp /app/web/prisma/prod.db /data/db/prod.db
  chmod 666 /data/db/prod.db
fi

echo "→ Starting Web Frontend (Next.js) on port ${PORT:-8080}..."
cd /app/web
exec node server.js
