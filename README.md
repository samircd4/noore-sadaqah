# Noore Sadaqah Foundation website

Website for নূরে সাদাকাহ ফাউন্ডেশন: programs, funds, one-time and monthly donations, news, gallery,
donor accounts and a staff admin. Bengali first, English second.

**Status:** planning and design docs only; no code yet. Start with `docs/ROADMAP.md`.

## Repo layout

```
CLAUDE.md            Shared rules for AI coding assistants (read automatically by Claude Code)
README.md            This file
frontend/            Next.js 16 (JavaScript) — see frontend/CLAUDE.md
backend/             Django + DRF, Celery — see backend/CLAUDE.md
docs/
  DECISIONS.md       Decisions made so far, and the open ones
  ARCHITECTURE.md    Stack, how the apps talk, folders, env vars
  API.md             Contract between frontend and backend
  DATA_MODEL.md      Django models
  DONATION_FLOW.md   One-time and monthly donations, receipts, zakat calculator
  SECURITY.md        Auth, cookies, headers, throttles, personal data
  DESIGN_SYSTEM.md   Palette, typography, components, contrast rules
  RESPONSIVE.md      Mobile spec: 320px and up, phone layout of every section and page
  HOME_PAGE.md       Home page sections → components, seed content, fixes
  PAGES.md           Spec for every other page
  ADMIN.md           Django admin: groups, permissions, workflows
  I18N.md            Bengali/English setup, message keys, formatting
  NOTIFICATIONS.md   SMS and email templates
  CONTENT.md         Real organisation facts and accounts to collect (TODO list)
  POLICIES.md        Privacy, terms, refund policy drafts (need legal review)
  ZAKAT_POLICY.md    Zakat & fitra decisions (need Shariah advisor sign-off)
  SEO_ANALYTICS.md   Metadata, sitemap, analytics with consent
  TESTING.md         Test layers, sandbox payments, CI
  DEPLOYMENT.md      Hostinger VPS setup, services, backups, launch day
  RUNBOOK.md         Day-to-day operations and incident procedures
  ROADMAP.md         Build phases with ready-to-paste prompts
  QA_CHECKLIST.md    Tests for each phase and before launch
```

## Stack at a glance

| Part | Choice |
|---|---|
| Frontend | Next.js 16, JavaScript, Tailwind v4, next-intl |
| Backend | Django 5.2 + DRF, PostgreSQL, Celery + Redis |
| Auth | JWT (simplejwt) in httpOnly cookies for donors; Django admin login + 2FA for staff |
| Admin | Django admin + Unfold |
| Payments | SSLCommerz, bKash Tokenized Checkout |
| Files | Cloudflare R2 |
| Hosting | One Hostinger VPS (Nginx, systemd) |

## Palette at a glance

| Emerald (primary) | Sand (neutral) | Gold (accent) |
|---|---|---|
| `em-50` #EAF6F0 | `sand-50` #FBF8F2 — page bg | `gold-400` #F4D27A |
| `em-100` #CDE9DC | `sand-100` #F5EEDF | `gold-500` #D6A83F — donate |
| `em-500` #1F8A63 | `sand-200` #EADFC8 — borders | `gold-600` #B88725 |
| `em-600` #16704F | `sand-300` #DCCBA6 | |
| `em-700` #0F5A3F — buttons | | |
| `em-800` #0B4631 | | |
| `em-900` #072E20 — header | | |
| `em-950` #041C13 — text | | |

Fonts: **Noto Serif Bengali** (headings) · **Noto Sans Bengali** (body).

## How to start

1. Start Track A in `docs/ROADMAP.md` (content, purchases, legal and Shariah reviews): it takes weeks.
2. Run phase F0 in `docs/ROADMAP.md`. The frontend is built first against a mock API (F0–F5), then the Django backend (B1–B4), then launch (L).
3. At the end of each phase, run the matching section of `docs/QA_CHECKLIST.md`.

## Run everything with Docker (development)

One command runs the whole site: Next.js, Django, Celery, Postgres, Redis and Mailpit. Production does not use
Docker (`docs/DEPLOYMENT.md`).

**First time**

1. Install **Docker Desktop** and start it (on Windows it uses WSL 2; accept that when the installer asks).
   Check it works: `docker compose version`.
2. Create the backend settings: copy `backend/.env.example` to `backend/.env` and fill in at least
   `DJANGO_SECRET_KEY`, `RECEIPT_TOKEN_SECRET` and `DB_PASSWORD` (any value; make secrets with
   `python -c "import secrets; print(secrets.token_urlsafe(50))"`). For sandbox payments add the SSLCommerz store id
   and password. `frontend/.env.local` is optional: Docker sets the values the frontend needs.
3. From the repo root:

   ```bash
   docker compose up --build        # builds the images, then starts everything (Ctrl+C stops it)
   ```

   The first build takes a few minutes. Django runs its migrations on start, and on the very first start it also
   loads all the content from the frontend fixtures, downloads their photos, creates the staff groups and the
   admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (`seed --if-empty`; later starts skip it).
4. To load the fixtures again later (this overwrites what you edited in the admin):

   ```bash
   docker compose exec web uv run python manage.py seed
   ```

**Where things are**

| Address | What |
|---|---|
| http://localhost:3000 | The website (it forwards `/api/`, `/admin/`, `/r/` and `/media/` to Django) |
| http://localhost:3000/admin/ | Django admin: content, settings, donations, messages |
| http://localhost:3000/api/docs/ | API docs (Swagger): every endpoint, try them in the browser |
| http://127.0.0.1:8025 | Mailpit: every email the site sends lands here, none reach a real inbox |
| http://127.0.0.1:8000 | Django directly (rarely needed) |

By default **content, forms and donations come from Django** (`API_LIVE_GROUPS=content,forms,donations`); only donor
login and the `/account` pages are still mocked (they arrive with B3). Edit something in the admin and the page
updates (Django tells Next.js to refresh its cache). Change it for one run:
`API_LIVE_GROUPS= docker compose up` (everything mocked), or set `API_MODE` / `API_LIVE_GROUPS` in a root `.env` file.

**Every day**

```bash
docker compose up -d                       # start in the background
docker compose logs -f frontend web worker # watch the logs (Ctrl+C stops watching, not the site)
docker compose ps                          # what is running
docker compose down                        # stop everything (the database is kept)
```

Code edits show up by themselves (Next.js and Django reload). Two exceptions:

| You changed | Run |
|---|---|
| Celery task code | `docker compose restart worker` |
| `package.json` or `pyproject.toml` | `docker compose up -d --build -V` (`-V` refreshes the installed packages) |

**Other useful commands**

```bash
docker compose exec web uv run pytest                          # backend tests
docker compose exec web uv run python manage.py createsuperuser
docker compose exec web uv run python manage.py makemigrations
docker compose exec frontend npm run lint                      # frontend checks run in the container too
docker compose down -v                                         # stop AND delete the database: a fresh start
```

The backend alone still runs from `backend/` with `docker compose -f docker-compose.dev.yml up -d` (see
`backend/CLAUDE.md`).
