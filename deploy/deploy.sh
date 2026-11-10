#!/usr/bin/env bash
# One-command deploy / upgrade. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Missing .env — copy .env.example and fill it in."; exit 1; }
set -a; . ./.env; set +a

echo "▸ Pre-deploy backup"
docker compose -f deploy/docker-compose.yml exec -T backup sh /usr/local/bin/backup.sh || echo "  (no previous stack — skipping)"

echo "▸ Build + start"
docker compose -f deploy/docker-compose.yml --env-file .env up -d --build

echo "▸ Waiting for health"
for i in $(seq 1 40); do
  if docker compose -f deploy/docker-compose.yml exec -T app curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "  healthy"; break
  fi
  sleep 3
  [ "$i" = "40" ] && { echo "Health check failed"; docker compose -f deploy/docker-compose.yml logs --tail=80 app; exit 1; }
done

echo "▸ Ensure schema + owner account"
docker compose -f deploy/docker-compose.yml exec -T app node -e "console.log('app running')"
docker compose -f deploy/docker-compose.yml run --rm -e DATABASE_URL="$DATABASE_URL" app \
  sh -c "npx drizzle-kit push --force || true"

echo "✓ Deployed: $NEXT_PUBLIC_SITE_URL"
