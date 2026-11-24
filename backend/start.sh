#!/bin/sh
# Start command of the production image (Dockerfile): database migrations, the Celery worker in the background,
# then gunicorn in the foreground on the port the host gives us ($PORT).
set -e

python manage.py migrate --noinput

# Loads the fixture content and photos only when the database is still empty (first deploy).
# A failed seed is reported but doesn't stop the site from starting (run it again by hand: manage.py seed).
if [ "${SEED_ON_START:-false}" = "true" ]; then
    python manage.py seed --if-empty || echo "WARNING: seed failed; the site starts without the fixture content." >&2
fi

# Receipt emails, the nightly cleanup and cache refreshes. RUN_WORKER=false when the worker runs as its own app.
if [ "${RUN_WORKER:-true}" = "true" ]; then
    celery -A config worker --beat --concurrency "${CELERY_CONCURRENCY:-2}" --loglevel info \
        --schedule /tmp/celerybeat-schedule &
fi

exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${WEB_CONCURRENCY:-2}" \
    --timeout 60 \
    --access-logfile - \
    --forwarded-allow-ips "*"
