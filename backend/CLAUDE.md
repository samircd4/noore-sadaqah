# backend/CLAUDE.md: Django + DRF app

Read the root `../CLAUDE.md` first; its hard rules apply here too. This file adds the backend rules.

## Stack

Python 3.14 (`.python-version`; uv) · Django 5.2 LTS · Django REST Framework · simplejwt · PostgreSQL 16 · Celery + Redis + django-celery-beat ·
django-unfold · django-storages (R2) · WeasyPrint · pytest-django · ruff.

Layout: a plain Django project. `config/` holds the one `settings.py` (every value from `.env`; `DJANGO_DEBUG=true`
locally), `urls.py`, `celery.py` and `wsgi.py`. Apps sit next to `manage.py`: `core/`, `accounts/`, `content/`,
`donations/`, `payments/`, `notifications/`, `engagement/`, `audit/` (see `../docs/ARCHITECTURE.md`). Keep the code plain and easy to read: function views,
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
docker compose up -d db redis mailpit               # from the repo root: Postgres 16 + Redis + Mailpit
uv sync                                             # creates .venv from uv.lock
cp .env.example .env                                # then fill in the secrets (never committed)
uv run python manage.py migrate && uv run python manage.py seed   # fixtures + photos (--no-images: skip photos)
uv run python manage.py runserver 8000
uv run celery -A config worker -B -l info           # dev only (worker + beat in one process)
uv run pytest
uv run ruff check . && uv run ruff format .
```

**Or run everything in Docker:** one compose file at the repo root, `compose.yaml` (guide in the root `README.md`).
`web` (Django on 127.0.0.1:8000, runs `migrate` and `seed --if-empty` on start) and `worker` (Celery + beat) use
`Dockerfile.dev`, read `backend/.env`, and get `DB_HOST=db` / `REDIS_URL=redis://redis:6379/0` from compose. The code
is mounted, so runserver reloads; the worker does not (restart it). Pango is in the image, so receipt PDFs work
without MSYS2. Every email sent in development lands in Mailpit: open http://127.0.0.1:8025 (nothing reaches a real
inbox). Run these from the repo root:

```bash
docker compose up -d --build                     # Postgres, Redis, Mailpit, Django, Celery, Next.js
docker compose exec web uv run python manage.py seed
docker compose exec web uv run pytest
docker compose restart worker                    # after changing task code
docker compose logs -f web worker
```

**Production** uses the other image, `Dockerfile` (gunicorn, no dev tools), through the root `compose.prod.yaml` on
the VPS (`../docs/DEPLOYMENT.md`). A new Python package that production needs goes in the main dependencies, not
`--dev`: the production image installs only those.

In Docker, requests from the Next.js dev server arrive from the Docker gateway IP, not 127.0.0.1, so
`client_ip()` ignores `X-Forwarded-For` and every local visitor shares one rate-limit bucket. Fine for development.

**Receipt PDFs need Pango** (WeasyPrint's text library):
- Windows: `winget install MSYS2.MSYS2`, then in the MSYS2 shell `pacman -S mingw-w64-ucrt-x86_64-pango`,
  and set `WEASYPRINT_DLL_DIRECTORIES=C:\msys64\ucrt64\bin` in `.env`.
- Ubuntu: `apt install libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b`.

Without it everything else works; only the receipt download fails, and its PDF test is skipped.

**API docs:** http://127.0.0.1:8000/api/docs/ (Swagger UI, from `drf-spectacular`). Every DRF view needs an
`@extend_schema(...)` above `@api_view` (content views take theirs from `content/docs.py`). Check with
`uv run python manage.py spectacular --validate --fail-on-warn --file /dev/null`.

**Admin:** every `ModelAdmin` extends `core.admin_base.Admin` (Unfold) or `AuditedAdmin` (writes the AuditLog).
Lists inside a model are row tables edited as inlines (`SortedTabularInline`), never JSON fields (DECISIONS.md D18).
Who may do what: `core/groups.py` (applied by `seed`) plus `get_readonly_fields` / `has_*_permission` in the admins.
