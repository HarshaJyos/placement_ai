# ─── FastAPI AI Service — Production Dockerfile ───────────────────────────────
# Python 3.10 slim, non-root, pip-cached, minimal image

FROM python:3.10-slim AS base

# System deps needed by pdfplumber, soundfile, numpy, whisper, better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libssl-dev \
        libffi-dev \
        libsndfile1 \
        ffmpeg \
        git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install Python deps (cached layer) ────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
 && pip install --no-cache-dir --no-build-isolation -r requirements.txt

# ── Copy application source ────────────────────────────────────────────────────
COPY . .

# ── Create storage directories ─────────────────────────────────────────────────
RUN mkdir -p /data/storage/audio /data/storage/video /data/storage/resumes

# ── Non-root user for security ─────────────────────────────────────────────────
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
 && chown -R appuser:appgroup /app /data
USER appuser

# ── Runtime env (overridden by docker-compose / platform) ─────────────────────
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

EXPOSE 8000

# ── Start server (production — no reload) ─────────────────────────────────────
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
