#!/bin/sh
set -e

# Automatically map Render's dynamic external URL to NEXTAUTH_URL if not explicitly set
if [ -z "$NEXTAUTH_URL" ] && [ -n "$RENDER_EXTERNAL_URL" ]; then
  echo "→ Auto-detecting NEXTAUTH_URL: $RENDER_EXTERNAL_URL"
  export NEXTAUTH_URL="$RENDER_EXTERNAL_URL"
fi

# Copy pre-migrated DB template to SQLite destination if it doesn't exist
if [ -n "$DATABASE_URL" ]; then
  DB_PATH=$(echo "$DATABASE_URL" | sed 's/^file://')
  mkdir -p "$(dirname "$DB_PATH")"
  if [ ! -f "$DB_PATH" ]; then
    echo "→ Initializing SQLite database at $DB_PATH..."
    cp /app/prisma/prod.db "$DB_PATH"
    chmod 666 "$DB_PATH"
  fi
fi

echo "→ Starting Next.js server..."
exec node server.js
