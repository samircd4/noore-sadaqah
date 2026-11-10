# backend/CLAUDE.md: Django + DRF app

Read the root `../CLAUDE.md` first; its hard rules apply here too. This file adds the backend rules.

## Stack

Python 3.14 (`.python-version`; uv) · Django 5.2 LTS · Django REST Framework · simplejwt · PostgreSQL 16 · Celery + Redis + django-celery-beat ·
django-unfold · django-storages (R2) · WeasyPrint · pytest-django · ruff.

Layout: a plain Django project. `config/` holds the one `settings.py` (every value from `.env`; `DJANGO_DEBUG=true`
locally), `urls.py`, `celery.py` and `wsgi.py`. Apps sit next to `manage.py`: `core/`, `accounts/`, `content/`,
`donations/`, `payments/` (see `../docs/ARCHITECTURE.md`). Keep the code plain and easy to read: function views,
short functions with a comment saying what they do and why, no extra layers.

## Rules

1. **Models follow `../docs/DATA_MODEL.md`.** Change the doc and the model in the same commit. Money is
   `PositiveIntegerField` (integer taka). Bilingual fields are `*_bn` / `*_en`; images have `*_alt_bn`.
2. **Endpoints follow `../docs/API.md` exactly**: paths, field names (snake_case), error shape and codes,
   pagination, throttles. Add an endpoint to API.md before writing it.
3. **Serializers validate everything.** Never trust the client's amount, fund, totals or status. Normalise phone
   numbers and Bengali digits in the serializer. Error codes are the message keys listed in API.md.
4. **Only `donations/services.py::mark_paid()` sets a donation PAID**, inside `transaction.atomic()` with
   `select_for_update()`. Callbacks validate with the gateway server-to-server first and are idempotent.
   Store every callback as a `GatewayEvent` (secrets removed).
5. **Side effects after commit:** SMS, email, receipts and revalidation run as Celery tasks queued with
   `transaction.on_commit(...)`. Never send SMS/email inside a request.
6. **Celery tasks are safe to run twice** (locks, unique constraints, status checks). `acks_late=True`.
7. **Zakat lock:** a donation's fund can never change; zakat totals are always reported separately.
8. **Never log PII or secrets** (phone, email, name, OTP, tokens, gateway passwords); see `../docs/SECURITY.md` §7.
   Log ids only: `logger.info("donation %s paid", donation.pk)`.
9. **Admin follows `../docs/ADMIN.md`**: permissions per Group, custom actions check `has_perm`, no delete
   permission on money and audit models, every sensitive change calls `audit(...)`.
10. **Migrations:** create with `makemigrations`, review the SQL for big tables, commit them, never edit one that
    has been deployed. Keep migrations backward compatible with the running code.
11. **Time:** store UTC; use `timezone.localtime()` (Asia/Dhaka) for "which day/year" logic (receipt year, due dates, reports).
12. **Tests are required** for payments, receipts, subscriptions, auth and permissions (`../docs/TESTING.md`).
    Mock gateway HTTP with `responses`; use Postgres, not SQLite.
13. **Gateway HTTP calls** have a 10-second timeout, are logged as GatewayEvents, and their clients live only in
    `payments/sslcommerz.py` and `payments/bkash.py`.
14. **Zakat calculator and fitra logic** must not be written until `../docs/ZAKAT_POLICY.md` is signed off.

## Commands

Dependencies are managed with **uv**: `pyproject.toml` + `uv.lock` (no requirements files). Add one with
`uv add <pkg>` (or `uv add --dev <pkg>`), then commit both files.

```bash
docker compose -f docker-compose.dev.yml up -d      # Postgres 16 + Redis for local work and tests
uv sync                                             # creates .venv from uv.lock
cp .env.example .env                                # then fill in the secrets (never committed)
uv run python manage.py migrate && uv run python manage.py seed
uv run python manage.py runserver 8000
uv run celery -A config worker -B -l info           # dev only (worker + beat in one process)
uv run pytest
uv run ruff check . && uv run ruff format .
```
