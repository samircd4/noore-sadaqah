# CLAUDE.md — Noore Sadaqah Foundation website

Instructions for AI coding assistants working in this repo. Read this first, every session,
then the `CLAUDE.md` of the app you are working in (`frontend/` or `backend/`).

## Project

Bengali-first charity website for **Noore Sadaqah Foundation (নূরে সাদাকাহ ফাউন্ডেশন)**:
programs, funds, one-time and monthly donations, news, gallery, donor accounts, staff admin.

```
noore-sadaqah/
├── CLAUDE.md          ← you are here (shared rules)
├── docs/              ← specs; the source of truth for both apps
├── design/            ← tokens.css, reference/home.html
├── frontend/          ← Next.js 16, JavaScript, Tailwind v4   → frontend/CLAUDE.md
└── backend/           ← Django + DRF, Celery, PostgreSQL       → backend/CLAUDE.md
```

Nginx serves one domain: `/` → Next.js, `/api/` and `/admin/` → Django (see `docs/ARCHITECTURE.md`).

## Docs (read the relevant one before starting a task)

| Doc | What's in it |
|---|---|
| `docs/DECISIONS.md` | Decisions already made; **don't reopen them** |
| `docs/ARCHITECTURE.md` | Stack, how the two apps talk, folder structure, env vars |
| `docs/API.md` | **Contract between frontend and backend**: every endpoint, request, response, error code |
| `docs/DATA_MODEL.md` | Django models |
| `docs/DONATION_FLOW.md` | Payments, recurring giving, receipts, zakat calculator |
| `docs/SECURITY.md` | JWT cookies, CSRF, headers, throttles, PII rules |
| `docs/DESIGN_SYSTEM.md` | Palette, typography, component classes, contrast rules |
| `docs/RESPONSIVE.md` | **Mobile spec**: widths down to 320px, phone layout of every section and page, touch, performance |
| `docs/HOME_PAGE.md` | Home page section map, seed content, fixes to apply |
| `docs/PAGES.md` | Section-by-section spec for every page other than home |
| `docs/ADMIN.md` | Django admin: staff groups, permissions, admin screens, workflows |
| `docs/I18N.md` | bn/en routing, message keys, number/date formatting, error codes |
| `docs/NOTIFICATIONS.md` | SMS and email templates |
| `docs/CONTENT.md` | Real organisation facts; `TODO` items must not go live |
| `docs/POLICIES.md` | Privacy, terms and refund policy drafts |
| `docs/ZAKAT_POLICY.md` | Zakat/fitra rules; **do not implement until signed off** |
| `docs/SEO_ANALYTICS.md` | Metadata, sitemap, analytics with consent |
| `docs/TESTING.md` | How to test each layer, sandbox payments, CI |
| `docs/DEPLOYMENT.md` | VPS setup, services, backups, monitoring, launch |
| `docs/RUNBOOK.md` | Operations: disputes, reconciliation, restores, key rotation |
| `docs/ROADMAP.md` | Build order and ready-to-paste prompts |
| `docs/QA_CHECKLIST.md` | Tests to pass at the end of each phase |

## Hard rules (both apps)

1. **Languages:** `frontend/` is **JavaScript only** (`.js` / `.jsx`; no TypeScript, no `.ts`/`.tsx`, no `tsconfig.json`; JSDoc where a type helps). `backend/` is **Python / Django**.
2. **The API contract is `docs/API.md`.** Change it first, then the mock (`frontend/src/mocks/`), the frontend and the backend, in the same commit. Never call an endpoint that isn't documented there.
3. **The home page is `design/reference/home.html`.** The Next.js home page must look the same. Don't redesign it; only apply the fixes in `docs/HOME_PAGE.md`.
4. **Colors come only from the palette** in `design/tokens.css`: `em-*`, `sand-*`, `gold-*` plus white/black. No new hex values, no `blue-*`, `yellow-*`, `gray-*` for brand UI. If a new color is truly needed, add it to `tokens.css` and `DESIGN_SYSTEM.md` first.
5. **Text on gold is `text-em-950`**, never white (contrast 2.2:1 fails).
6. **No hard-coded content.** Text, numbers and images come from the API through `frontend/src/lib/api.js` (served by the mock fixtures in `frontend/src/mocks/` while `API_MODE=mock`, see `docs/ARCHITECTURE.md` "API modes"). UI labels go in `frontend/messages/{bn,en}.json`.
7. **Bengali is the default language.** Store plain numbers; display with `bnNumber()` / `taka()` (frontend) or the matching template filters (backend).
8. **Money is integer taka** (`PositiveIntegerField` / JS integer). Never floats, never `Decimal` with fractions.
9. **A donation becomes PAID only from server-side gateway validation in Django**, never from a browser redirect. Callbacks must be idempotent. See `docs/DONATION_FLOW.md`.
10. **Validate every input on the server** (DRF serializers are the source of truth). The frontend also validates with Zod for a better experience.
11. **Secrets stay in `.env` files that are never committed.** Never `NEXT_PUBLIC_` a secret. Update the matching `.env.example` when adding a variable.
12. **Zakat money stays in zakat funds.** No code path may move a zakat donation to a non-zakat fund.
13. **Never log or send to Sentry** donor phone numbers, emails, OTP codes, tokens or gateway secrets.
14. **Mobile first, down to 320px.** Follow `docs/RESPONSIVE.md`: build the phone layout first, check every component at 320, 375, 768 and 1440, touch targets ≥ 44px, no horizontal scroll. Its "definition of done" (§18) applies to every page.

## Conventions

- Commits: small, one feature each, message in English. If a change touches both apps, one commit is fine.
- Dates are stored in UTC and shown in `Asia/Dhaka`.
- Slugs are English, lower-case, hyphenated (`orphan`, `water`).
- **Spelling:** the foundation's name is `নূরে সাদাকাহ ফাউন্ডেশন`, and the word itself is always **সাদাকাহ** (fund name, headlines, quotes). Never write "সদকা" or "সদকাহ". Inflected forms: সাদাকাহর, সাদাকায়ে জারিয়া.

## Commands

```bash
# frontend (works alone: API_MODE=mock needs no backend)
cd frontend && npm run dev        # http://localhost:3000
cd frontend && npm run lint && npm run build

# backend
cd backend && python manage.py runserver 8000
cd backend && python manage.py makemigrations && python manage.py migrate
cd backend && pytest
cd backend && celery -A config worker -B -l info   # dev only; production runs worker and beat separately
```

## When unsure

Check the docs above. If they don't answer it, ask instead of guessing, especially for payments, zakat rules, and anything donors will see.
