# Architecture

Website for **Noore Sadaqah Foundation (নূরে সাদাকাহ ফাউন্ডেশন)**: a Bengali-first charity site where
people learn about the foundation's programs and donate to specific funds, once or every month.

Why it is built this way: `DECISIONS.md` D1–D11.

## Stack

### Frontend (`frontend/`): JavaScript only

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16**, App Router, JavaScript (`.js`/`.jsx`) | No TypeScript. `jsconfig.json` for the `@/*` alias. JSDoc where types help. |
| Styling | **Tailwind CSS v4** | Tokens from `design/tokens.css`. No CSS-in-JS, no component library. |
| Validation | **Zod** + **react-hook-form** | Mirrors the server rules for fast feedback; Django is the authority |
| i18n | **next-intl** | `bn` default, `en` second (`I18N.md`) |
| Icons | `lucide-react` | |
| Data | `fetch` to Django from the **server only** (`src/lib/api.js`) | Never from the browser (see "How the apps talk") |

### Backend (`backend/`): Python

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Django 5.2 LTS** + **Django REST Framework** | |
| Database | **PostgreSQL 16+** | `ArrayField`, `JSONField`, row locks |
| Auth | **djangorestframework-simplejwt** (donors) · Django sessions (staff in admin) | Token blacklist app on; see `SECURITY.md` |
| Admin | **Django admin + django-unfold** | `ADMIN.md` |
| Jobs | **Celery** + **Redis** + **django-celery-beat** | SMS, email, recurring charges, cleanup |
| Payments | **SSLCommerz** (cards, Nagad, Rocket, net banking) + **bKash Tokenized Checkout** | `DONATION_FLOW.md` |
| PDF | **WeasyPrint** (HTML → PDF, Bengali shaping via HarfBuzz) | Fonts embedded from `backend/static/fonts/` |
| Files | **django-storages** → **Cloudflare R2** | Public bucket for images, private bucket for PDFs |
| CSV | **django-import-export** | Admin exports |
| Audit | Custom `AuditLog` model + admin `LogEntry` | `ADMIN.md` |
| SMS / email | A Bangladeshi SMS gateway (SSL Wireless, BulkSMSBD, Alpha SMS …) · Resend or SMTP | Behind `notifications/providers.py`; `NOTIFICATIONS.md` |
| Errors | `sentry-sdk` (both apps) | PII stripped (`SECURITY.md`) |
| Tests | `pytest-django`, `factory_boy`, `responses` (mock gateways) | `TESTING.md` |
| Lint | `ruff` (lint + format) | |

### Infrastructure

One **Hostinger VPS** (Ubuntu 24.04 LTS): Nginx, Next.js (Node 22 LTS), Gunicorn, Celery worker, Celery beat,
PostgreSQL, Redis. Media on Cloudflare R2. Details: `DEPLOYMENT.md`.

## How the apps talk

```
                         ┌───────────────────────── VPS ─────────────────────────────┐
Browser ── HTTPS ──► Nginx ─┬─ /                    → Next.js  localhost:3000          │
                            ├─ /admin/              → Gunicorn 127.0.0.1:8000 (Django) │
                            ├─ /dj-static/          → files from collectstatic         │
                            ├─ /api/v1/payments/    → Django (gateway callbacks)       │
                            ├─ /api/v1/receipts/, /r/ → Django (signed receipt links) │
                            ├─ /api/v1/health/      → Django                           │
                            └─ /api/* (anything else) → 404 from outside               │
                                                                                       │
Next.js server ── http://127.0.0.1:8000/api/v1/… (Bearer JWT, X-Forwarded-For) ──► Django
Django ── PostgreSQL · Redis ──► Celery worker / beat
Django ── SSLCommerz · bKash · SMS gateway · email · Cloudflare R2
Django ── POST http://localhost:3000/internal/revalidate (secret) ──► Next.js cache
                         └──────────────────────────────────────────────────────────┘
```

Rules:

1. **The browser talks only to Next.js** (plus the gateway pages and the public R2 image domain). Pages read data in
   server components; forms submit to **Next server actions**, which call Django. So the public internet sees only the
   few Django URLs that must be public: gateway callbacks, signed receipt links (`/r/`), health and the staff admin.
2. **Next.js has no `/api/*` routes.** Nginx sends `/api/` to Django. Next route handlers that are needed
   (receipt PDF proxy, revalidate hook) live under other paths.
3. **Next.js never touches the database.** Every read and write goes through a documented endpoint in `API.md`.
4. **Donor JWTs live in httpOnly cookies set by Next.js** (`ns_access`, `ns_refresh`). `src/proxy.js` refreshes an
   expired access token before the page renders. Browser JavaScript never sees a token (`SECURITY.md`).
5. **Client IP:** Nginx sets `X-Forwarded-For: $remote_addr` (overwrite, not append). Next.js forwards that value to
   Django, so throttles count the real visitor, not the Next.js server. Django trusts the header only from `127.0.0.1`.
6. **Caching (Next.js Cache Components, `cacheComponents: true`):** public content is read with `apiGet()`, which
   runs inside `"use cache"` with `cacheTag(...)` (tags per endpoint in API.md) and `cacheLife("minutes")`. Cached
   functions can't read headers or cookies, so the locale is passed in. Everything else (writes, donation status,
   `/me/*`) uses `apiRequest()`, which is never cached. When staff save in the admin, a Django signal enqueues a
   Celery task that POSTs the changed tags to Next's `/internal/revalidate` (header `X-Revalidate-Secret`), which
   calls `revalidateTag(tag, "max")`. Nginx blocks `/internal/` from outside.
7. **Gateway callbacks go to Django.** After validation Django **303-redirects** the browser to
   `/{locale}/donate/success?id=…` or `/{locale}/donate/failed?id=…` on the Next.js side (`locale` = the donation's `locale`) (`DONATION_FLOW.md`).
8. **Client components** (`"use client"`) only where there is interaction: quick-donate form, donate form, mobile menu,
   language switch, gallery lightbox, video modal, zakat calculator, tabs, success-page polling.

## API modes (frontend)

The frontend is built before the backend (DECISIONS.md D13). `src/lib/api.js` is the only file that knows where data
comes from; pages, components and server actions call `apiGet()` / `apiPost()` the same way in every mode.

| `API_MODE` | Used for | Reads | Writes (forms, donations, login) |
|---|---|---|---|
| `mock` | Development, CI, staging demos | `src/mocks/fixtures/` via `handlers.js` | Simulated in `store.js`: validation errors, throttling, fake gateway (`/donate/mock-gateway`), OTP code `123456` |
| `static` | Pre-launch site for the gateway reviewers | Fixtures (real foundation content only) | Turned off: forms show "শীঘ্রই চালু হবে", donate buttons show bank and merchant numbers |
| `live` | Staging and production once Django exists | Django at `API_INTERNAL_URL` | Django |

Rules:
- The mock implements **API.md exactly**: same paths, status codes, JSON shapes, error codes, pagination and language
  resolution (`{bn, en}` fixture fields resolved by `Accept-Language`). Mock validation reuses the frontend Zod schemas
  and returns the DRF error shape.
- Images in fixtures point to `public/mock-images/` or the Unsplash placeholders from the design; `next.config.mjs`
  allows those hosts only when `API_MODE !== "live"`.
- `next build` with `NODE_ENV=production` refuses `API_MODE=mock` unless `ALLOW_MOCK_IN_PRODUCTION=1` (staging demo only).
- Switching an endpoint group to Django is a config change, not a code change. During the backend phases, `live` can
  be enabled per group with `API_LIVE_GROUPS=content,forms` (everything else stays mocked) until all groups are live.

## Folder structure

```
noore-sadaqah/
├── CLAUDE.md                       # shared rules
├── README.md
├── .gitignore                      # node_modules, .next, .venv, __pycache__, .env*, media/
├── .github/workflows/ci.yml        # lint + tests for both apps (TESTING.md)
├── design/
│   ├── tokens.css                  # palette & fonts (source of truth)
│   ├── tailwind.config.js          # reference only (Tailwind v3); not used by the build
│   └── reference/home.html         # approved home page design
├── docs/
├── deploy/                         # nginx site, systemd units, backup script (DEPLOYMENT.md)
├── e2e/                            # Playwright end-to-end tests (TESTING.md)
│
├── frontend/
│   ├── CLAUDE.md
│   ├── .env.example
│   ├── jsconfig.json
│   ├── next.config.mjs             # images.remotePatterns for the R2 domain, security headers
│   ├── messages/                   # bn.json, en.json
│   ├── public/                     # logo, favicon, og image
│   └── src/
│       ├── proxy.js                # locale + /account protection + token refresh (Next 16)
│       ├── i18n/                   # next-intl routing.js, request.js
│       ├── app/
│       │   ├── globals.css         # @import "tailwindcss"; @import "../../../design/tokens.css";
│       │   ├── [locale]/
│       │   │   ├── layout.jsx      # fonts, <html lang>, Header, Footer
│       │   │   ├── page.jsx        # HOME (design/reference/home.html)
│       │   │   ├── about/ programs/ programs/[slug]/ campaigns/[slug]/
│       │   │   ├── donate/ donate/[fund]/ donate/checkout/ donate/success/ donate/failed/
│       │   │   ├── donate/mock-gateway/     # fake payment page, API_MODE=mock only (notFound() otherwise)
│       │   │   ├── zakat-calculator/ get-involved/ news/ news/[slug]/ gallery/ contact/
│       │   │   ├── transparency/ privacy/ terms/ refund-policy/ login/
│       │   │   ├── account/ account/recurring/
│       │   │   ├── account/receipts/[id]/route.js  # streams the PDF from Django with the donor's JWT
│       │   │   └── not-found.jsx, error.jsx
│       │   ├── internal/revalidate/route.js     # called by Django only; excluded from the proxy matcher
│       │   ├── sitemap.js, robots.js
│       ├── components/
│       │   ├── ui/          # Button, Badge, Input, Select, SectionHeader, StatCard, ProgressBar,
│       │   │                # EmptyState, Pagination, Accordion, Tabs, Breadcrumb
│       │   ├── layout/      # Header, MobileMenu, MobileDonateBar, Footer, LanguageSwitch, PageHero, CookieBanner
│       │   ├── home/        # Hero, Stats, AboutPreview, Programs, ProgramCard, CampaignBanner, …
│       │   └── donate/      # QuickDonate, AmountPicker, FundCard, DonateForm, DonateCta
│       ├── mocks/           # in-process mock of API.md (see "API modes")
│       │   ├── fixtures/    # site.json, funds.json, programs.json … ({bn, en} for translatable text)
│       │   ├── handlers.js  # "METHOD /path" → handler returning {status, body}
│       │   └── store.js     # in-memory donations, OTP codes, subscriptions (reset on restart)
│       └── lib/
│           ├── api.js       # apiGet / apiPost: base URL, auth header, XFF, error mapping
│           ├── session.js   # read/write the JWT cookies (server only)
│           ├── format.js    # bnNumber(), taka(), bnDate(), toLatinDigits(), shortNumber()
│           ├── validation/  # Zod schemas (return message keys)
│           └── actions/     # server actions: donate.js, auth.js, forms.js, account.js
│
└── backend/
    ├── CLAUDE.md
    ├── .env.example
    ├── pyproject.toml              # deps (uv or pip-tools), ruff and pytest config
    ├── manage.py
    ├── config/                     # settings/{base,dev,prod}.py, urls.py, celery.py, wsgi.py
    ├── apps/
    │   ├── core/                   # SiteSetting, health view, revalidate signal, format filters
    │   ├── accounts/               # User, OtpCode, OTP + JWT views
    │   ├── content/                # Fund, Program, ProgramImage, Campaign, Post, GalleryItem, Person, Report, Job
    │   ├── donations/              # Donation, ReceiptCounter, receipt PDF, services.mark_paid()
    │   ├── payments/               # sslcommerz.py, bkash.py clients, callback views, GatewayEvent
    │   ├── subscriptions/          # Subscription, charge tasks
    │   ├── engagement/             # ContactMessage, Volunteer, Subscriber
    │   ├── notifications/          # providers.py (SMS, email), tasks, OutboundMessage, templates
    │   └── audit/                  # AuditLog + helper audit(user, action, target, before, after)
    ├── templates/                  # receipts/receipt.html, emails/*.html, admin overrides
    ├── static/fonts/               # Noto Sans/Serif Bengali TTF for WeasyPrint
    ├── locale/                     # bn/en .po files (admin, SMS, email)
    └── tests/
```

## Pages (frontend routes)

Specs for each page: `HOME_PAGE.md` and `PAGES.md`. All public pages exist in Bengali (`/…`) and English (`/en/…`).

| Route | Content |
|---|---|
| `/` | Home: see HOME_PAGE.md |
| `/about` | Story, mission, principles, board members, registration number & certificate |
| `/programs`, `/programs/[slug]` | All programs; one program with goals, gallery, impact by year, FAQ, donate box |
| `/campaigns/[slug]` | Time-limited appeal with goal and progress bar |
| `/donate`, `/donate/[fund]` | All funds; one fund + donate form |
| `/donate/checkout`, `/donate/success`, `/donate/failed` | Review → pay; result pages (status read from Django) |
| `/zakat-calculator` | Calculator that fills the zakat donate form (after sign-off) |
| `/get-involved` | Tabs: monthly donor, volunteer form, careers |
| `/news`, `/news/[slug]`, `/gallery`, `/contact`, `/transparency` | Content pages |
| `/privacy`, `/terms`, `/refund-policy` | Policy pages; required by the gateways |
| `/login`, `/account`, `/account/recurring` | Donor OTP login, history, receipts, monthly plans |
| `/admin/` | **Django** admin (staff), not a Next.js page |

Django endpoints: `API.md`.

## Environment variables

### `frontend/.env.example`

```
API_MODE=mock                                      # mock | static | live (see "API modes")
API_LIVE_GROUPS=                                   # during backend phases: e.g. content,forms (rest stays mocked)
ALLOW_MOCK_IN_PRODUCTION=                          # 1 only for a staging demo build
NEXT_PUBLIC_SITE_URL=https://nooresadaqah.org
NEXT_PUBLIC_MEDIA_HOST=media.nooresadaqah.org      # public R2 domain, for next/image remotePatterns
API_INTERNAL_URL=http://127.0.0.1:8000/api/v1      # server only
REVALIDATE_SECRET=                                 # same value as the backend's
NEXT_PUBLIC_GA_ID=                                 # optional, loaded only after cookie consent
NEXT_PUBLIC_META_PIXEL_ID=                         # optional, loaded only after cookie consent
SENTRY_DSN=                                        # optional
```

### `backend/.env.example`

```
DJANGO_SETTINGS_MODULE=config.settings.prod
DJANGO_SECRET_KEY=
DJANGO_ALLOWED_HOSTS=nooresadaqah.org,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=https://nooresadaqah.org
DATABASE_URL=postgres://noore:***@127.0.0.1:5432/noore
REDIS_URL=redis://127.0.0.1:6379/0

SITE_URL=https://nooresadaqah.org                 # used to build callback and redirect URLs
FRONTEND_INTERNAL_URL=http://localhost:3000       # for the revalidate hook (localhost, see DEPLOYMENT.md)
REVALIDATE_SECRET=

JWT_SIGNING_KEY=                                  # separate from DJANGO_SECRET_KEY
RECEIPT_TOKEN_SECRET=                             # signs receipt links sent by SMS
FIELD_ENCRYPTION_KEY=                             # Fernet key; encrypts stored gateway tokens (DATA_MODEL.md)

SSLCOMMERZ_STORE_ID=
SSLCOMMERZ_STORE_PASSWORD=
SSLCOMMERZ_SANDBOX=true

BKASH_APP_KEY=
BKASH_APP_SECRET=
BKASH_USERNAME=
BKASH_PASSWORD=
BKASH_SANDBOX=true

SMS_PROVIDER=console                              # console | sslwireless | bulksmsbd | …
SMS_API_KEY=
SMS_SENDER_ID=
EMAIL_PROVIDER=console                            # console | resend | smtp
RESEND_API_KEY=
DEFAULT_FROM_EMAIL=রসিদ <receipts@nooresadaqah.org>
ADMIN_ALERT_EMAIL=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BUCKET=noore-media
R2_PRIVATE_BUCKET=noore-private
R2_PUBLIC_DOMAIN=media.nooresadaqah.org

SEED_ADMIN_EMAIL=                                 # first superuser, used only by `manage.py seed`
SEED_ADMIN_PASSWORD=
SENTRY_DSN=
```

Never commit a `.env`. Never expose gateway, JWT or R2 secrets with a `NEXT_PUBLIC_` prefix.
`console` providers print SMS and email to the Celery log in development; never use them in production.

## Security & trust (summary; full rules in SECURITY.md)

- A donation is marked **PAID only after server-side validation** with the gateway, inside Django.
- Throttle OTP, contact, volunteer, newsletter and donate endpoints (per IP and per phone).
- Staff permissions are enforced by Django admin permissions and Groups; every money or settings change writes an `AuditLog` row.
- Show the registration number, bank details and transparency reports publicly: donors look for them.
