# ── Stage 1: Build AI Service ─────────────────────────────────────────────────
FROM python:3.10-slim AS ai-builder
WORKDIR /app/ai-service

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*

COPY apps/ai-service/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir "setuptools<80" \
 && pip install --no-cache-dir --no-build-isolation -r requirements.txt

COPY apps/ai-service/ .

# ── Stage 2: Build Web Frontend (Deps) ───────────────────────────────────────
FROM node:20-slim AS web-deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

# ── Stage 3: Build Web Frontend (Builder) ────────────────────────────────────
FROM node:20-slim AS web-builder
WORKDIR /app/web
COPY --from=web-deps /app/web/node_modules ./node_modules
COPY apps/web/ .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN DATABASE_URL="file:./prisma/prod.db" npx prisma migrate deploy \
 && npm run build

# ── Stage 4: Production Runner ────────────────────────────────────────────────
FROM python:3.10-slim AS runner
WORKDIR /app

# Install Node.js (v20) and FFmpeg inside python-slim image
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y nodejs \
 && rm -rf /var/lib/apt/lists/*

# Copy AI Service (Python virtual environment and source code)
COPY --from=ai-builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=ai-builder /usr/local/bin /usr/local/bin
COPY apps/ai-service /app/ai-service

# Copy Web Frontend (standalone output)
COPY --from=web-builder /app/web/public /app/web/public
COPY --from=web-builder /app/web/.next/standalone /app/web
COPY --from=web-builder /app/web/.next/static /app/web/.next/static
COPY --from=web-builder /app/web/prisma /app/web/prisma
COPY --from=web-builder /app/web/src/generated /app/web/src/generated

# Create data directories
RUN mkdir -p /data/db /data/storage/resumes /data/storage/audio /data/storage/video

# Copy and set up the entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Run env vars (can be overridden by Cloud Run / docker-compose)
ENV DATABASE_URL=file:/data/db/prod.db \
    STORAGE_DIR=/data/storage \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    AI_SERVICE_URL=http://127.0.0.1:8000

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
