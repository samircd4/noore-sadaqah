#!/bin/sh
# Deploy (or update) the site on the VPS. Run from anywhere:  sh deploy/deploy.sh [git ref, default origin/master]
# Order matters: Django must be running before the frontend is built, because the build reads its content.
set -eu

cd "$(dirname "$0")/.."
REF="${1:-origin/master}"

[ -f deploy/.env ] || { echo "deploy/.env is missing: copy deploy/.env.example and fill it in." >&2; exit 1; }
COMPOSE="docker compose -f compose.prod.yaml"
# PROXY=nginx: an existing Nginx keeps ports 80/443 and forwards to Caddy on 127.0.0.1:8080 (DEPLOYMENT.md).
if grep -q '^PROXY=nginx' deploy/.env; then
    COMPOSE="$COMPOSE -f deploy/compose.behind-nginx.yaml"
fi
COMPOSE="$COMPOSE --env-file deploy/.env"
DOMAIN="$(grep '^DOMAIN=' deploy/.env | cut -d= -f2 | cut -d' ' -f1)"

echo "==> Code: $REF"
git fetch --quiet origin
git checkout --quiet --detach "$REF"

echo "==> Backend: build, then database, Redis, Django, worker and beat (migrations run on start)"
$COMPOSE build web
$COMPOSE up -d db redis web worker beat

echo "==> Waiting for Django"
i=0
until curl -fsS -o /dev/null http://127.0.0.1:8000/api/v1/health/; do
    i=$((i + 1))
    [ "$i" -lt 90 ] || { echo "Django did not start; see: $COMPOSE logs web" >&2; exit 1; }
    sleep 2
done
$COMPOSE exec -T web python manage.py check --deploy --fail-level ERROR

echo "==> Frontend: build from Django's live content, then start everything (Caddy too)"
$COMPOSE build frontend
$COMPOSE up -d

echo "==> Checks"
sleep 5
for path in /bn /en /api/v1/health/; do
    curl -fsS -o /dev/null "https://$DOMAIN$path" && echo "  ok  $path" || echo "  FAILED  $path (DNS or certificate not ready yet?)"
done

echo "$(date -Is) $(git rev-parse --short HEAD)" >> deploy/releases.log
docker image prune -f > /dev/null
echo "==> Done: https://$DOMAIN"
