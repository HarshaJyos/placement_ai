#!/bin/sh
set -e

# Automatically map Render's dynamic external URL to NEXTAUTH_URL if not explicitly set
if [ -z "$NEXTAUTH_URL" ] && [ -n "$RENDER_EXTERNAL_URL" ]; then
  echo "→ Auto-detecting NEXTAUTH_URL: $RENDER_EXTERNAL_URL"
  export NEXTAUTH_URL="$RENDER_EXTERNAL_URL"
fi

echo "→ Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "→ Starting Next.js server..."
exec node server.js
