# Production image for Django + Celery (docs/DEPLOYMENT.md). Development uses Dockerfile.dev (root compose.yaml).
#
# - VPS (compose.prod.yaml): the same image runs three services: web (start.sh, RUN_WORKER=false), worker and beat.
# - SnapDeploy: one container runs gunicorn and the Celery worker with beat (start.sh), since it has one start command.
FROM python:3.14-slim

# Pango + HarfBuzz for WeasyPrint's receipt PDFs (the fonts are embedded from static/fonts/).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libharfbuzz-subset0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.12.17 /uv /uvx /usr/local/bin/

ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_COMPILE_BYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app/backend

# Dependencies first (cached while only the code changes); no dev tools in production.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . .

# Admin CSS/JS into staticfiles/ (served by WhiteNoise). Settings need these two secrets to load; throwaway values
# are fine here because collectstatic uses neither, and the real ones only exist at run time.
RUN DJANGO_SECRET_KEY=build-only RECEIPT_TOKEN_SECRET=build-only python manage.py collectstatic --noinput

# Run as a normal user, not root. media/ exists in the image so a volume mounted there belongs to that user.
RUN useradd --create-home --uid 1000 app && mkdir -p /app/backend/media && chown -R app /app/backend
USER app

# The host sets PORT; 8000 when run anywhere else.
EXPOSE 8000
CMD ["sh", "start.sh"]
