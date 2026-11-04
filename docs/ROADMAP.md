# Roadmap & Vibe-Coding Prompts

**Frontend first** (DECISIONS.md D13): the whole Next.js site is built and tested against a **mock API inside
`frontend/src/lib/api.js`** (`API_MODE=mock`, see ARCHITECTURE.md "API modes"). Django comes after and plugs in by
switching to `API_MODE=live`, with no page changes.

```
Track A (non-code, from day one) ───────────────────────────────────────────────────────────►
F0 setup → F1 home → F2 content pages → F3 donation flow → F4 login & account → F5 English, SEO, e2e
                                   └─ (optional) pre-launch site, API_MODE=static
                                                         B1 Django content + admin → B2 donations → B3 accounts → B4 recurring
                                                                                                  → L launch
```

Each phase ends with something you can open in the browser and a QA_CHECKLIST section to pass.
The prompts are ready to paste to your AI assistant (it reads `CLAUDE.md` and `frontend/CLAUDE.md` or `backend/CLAUDE.md` first).
One phase per branch; run `/code-review` before merging and `/security-review` on every payment or auth change.

## Track A: non-code work (start on day one, runs in parallel)

These take weeks. The site can't launch without them.

- [ ] Foundation fills in `CONTENT.md` (registration, contact, bank, people, real stats, photos). Confirmed facts go
      straight into the mock fixtures, which later become the Django seed data.
- [ ] Buy domain, VPS, R2, SMS sender ID, mailbox, **in the foundation's name** (DEPLOYMENT.md "What to buy")
- [ ] Lawyer/board reviews `POLICIES.md`
- [ ] Shariah advisor answers and signs `ZAKAT_POLICY.md` (blocks the calculator and fitra in phase L)
- [ ] Ask bKash and SSLCommerz which **recurring** products our merchant accounts get (DONATION_FLOW.md "Gateway reality check")
- [ ] Answer the open decisions in `DECISIONS.md` (translator, Accountant role, admin cost %, tax wording, retention)
- [ ] Gateway applications are submitted. If they ask for a live site, deploy the **pre-launch site** (after F2)

---

## Frontend

### F0: Setup

- [ ] `git init`, root `.gitignore`, private remote; docs and design at the root
- [ ] `frontend/`: Next.js 16, JavaScript, App Router, Tailwind v4 with `design/tokens.css`, `src/`, `@/*` alias,
      next-intl (`bn` default, `localePrefix: "as-needed"`), `src/proxy.js`, ESLint, Vitest
- [ ] `src/lib/api.js` with the three API modes, `src/mocks/` skeleton, `src/lib/format.js` (+ tests)
- [ ] CI skeleton: lint, Vitest, build, i18n check, palette grep

> **Prompt:** "Set up `frontend/` as described in `docs/ARCHITECTURE.md` and `frontend/CLAUDE.md`: Next.js 16 in JavaScript (no TypeScript) with App Router, Tailwind v4, `src/` and the `@/*` alias. Wire `design/tokens.css` into `src/app/globals.css`; load Noto Sans Bengali and Noto Serif Bengali with next/font as `--font-sans` and `--font-head`; set up next-intl with `bn` default and `localePrefix: 'as-needed'` and `src/proxy.js`. Add the root `viewport` export and use the z-index tokens from `tokens.css` as described in `docs/RESPONSIVE.md` §10–11. Create `src/lib/api.js` with `API_MODE=mock|static|live` exactly as ARCHITECTURE.md 'API modes' describes, an empty `src/mocks/` (fixtures, handlers, store), and `src/lib/format.js` with Vitest tests. Add `frontend/.env.example`, a root `.gitignore`, and a GitHub Actions job for lint, test and build. No pages yet."

### F1: Home page

- [x] `src/components/ui/*` (Button, Badge, SectionHeader, StatCard, ProgressBar, Input, Select)
- [x] Header + mobile menu + Footer + LanguageSwitch in `[locale]/layout.jsx`
- [x] Fixtures + handlers for `GET /site/`, `/funds/`, `/programs/?featured=1`, `/campaigns/?featured=1`, `/gallery/?limit=6`, `/posts/`
- [x] Every home section from `HOME_PAGE.md`; all fixes applied · QA §1–2
- [ ] Real-device check (cheap Android, iPhone, link opened from Messenger/WhatsApp)

> **Prompt:** "Build the home page at `frontend/src/app/[locale]/page.jsx` so it matches `design/reference/home.html` exactly. Split it into the components listed in `docs/HOME_PAGE.md`. Load all content through `src/lib/api.js`; add the mock fixtures and handlers for every endpoint the home page uses, with the exact JSON shapes from `docs/API.md` and the seed content from HOME_PAGE.md / CONTENT.md (translatable fields as `{bn, en}`). Apply every fix in HOME_PAGE.md. Build each section **phone-first** from the table in `docs/RESPONSIVE.md` §14, including the phone header (§8) and the sticky donate bar (§9). UI labels go in `messages/bn.json` and `en.json`. Check it at 320, 375, 768 and 1440px against RESPONSIVE.md §18."

### F2: Content pages

- [ ] `/about`, `/programs`, `/programs/[slug]`, `/campaigns/[slug]`, `/news`, `/news/[slug]`, `/gallery`, `/contact`,
      `/get-involved`, `/transparency`, `/privacy`, `/terms`, `/refund-policy`, `not-found`, `error` (PAGES.md)
- [ ] Shared parts: PageHero, DonateCta, EmptyState, Pagination, Accordion, Tabs, Breadcrumb, Lightbox, VideoModal
- [ ] Forms (contact, volunteer, newsletter) as server actions → `POST /contact/`, `/volunteers/`, `/subscribers/` (mocked, with validation errors and throttling)
- [ ] Fixtures + handlers for every endpoint these pages use · QA §1, §3, §11

> **Prompt (one page at a time):** "Create `/programs/[slug]` as specified in `docs/PAGES.md`, using only components from `src/components/ui` and the patterns in `docs/DESIGN_SYSTEM.md`. Load data with `apiGet('/programs/{slug}/')`; add the fixture and handler with the exact shape from `docs/API.md`, including the 404 case. Build the phone layout first from `docs/RESPONSIVE.md` §15 and check at 320, 375, 768 and 1440px. Add `generateMetadata` and `generateStaticParams`, and all labels in both message files."

### F3: Donation flow (mock gateway)

- [ ] `/donate`, `/donate/[fund]` (DonateForm, AmountPicker, FundCard), `/donate/checkout`, `/donate/success`, `/donate/failed`
- [ ] `createDonation` and `refreshDonation` server actions; quick-donate on home uses the same action
- [ ] Mock `POST /donations/`, `GET /donations/{id}/status/`, `POST /donations/{id}/refresh/` and the
      **`/donate/mock-gateway`** page (success / fail / cancel / stay pending)
- [ ] Double-submit protection, `502 gatewayUnavailable` message, failed page pre-filled from `sessionStorage` · QA §3, UI parts of §4

> **Prompt:** "Build the donation pages from `docs/PAGES.md` (`/donate` through `/donate/failed`) and the `createDonation` / `refreshDonation` server actions. Use the endpoints in `docs/API.md` through `src/lib/api.js`. In mock mode, `POST /donations/` must store the donation in `src/mocks/store.js` and return `redirect_url` to `/donate/mock-gateway?id=…`, a page (mock mode only) with buttons for success, failure, cancel and 'stay pending' that sets the status and redirects like Django will. The success page must read the status from the API, never from the URL, and poll while PENDING."

### F4: Login and donor account (mock)

- [ ] `/login` (two steps), `login`/`verifyOtp`/`logout` server actions, httpOnly cookies (`src/lib/session.js`)
- [ ] `src/proxy.js`: protect `/account/*`, refresh the access token
- [ ] `/account`, `/account/recurring`, `/account/receipts/[id]` (mock returns a sample PDF)
- [ ] Monthly option on the donate form: login round-trip, then a mock Subscription
- [ ] Mock auth: code `123456`, short-lived mock access tokens so the refresh path is exercised · QA UI parts of §6, §9

> **Prompt:** "Implement donor login and the account pages as in `docs/PAGES.md`, `docs/API.md` (Auth, Donor account) and `docs/SECURITY.md` §2: tokens only in httpOnly cookies written by server actions via `src/lib/session.js`, refresh in `src/proxy.js`, `/account/*` protected. In mock mode the OTP is always `123456` (printed in the server console) and mock access tokens expire after 2 minutes so refresh is tested. Monthly giving on the donate form requires login and keeps the form across the round-trip."

### F5: English, SEO, accessibility, e2e

- [ ] English labels for every key; English content in the fixtures where available
- [ ] SEO_ANALYTICS.md: metadata, JSON-LD, sitemap, robots, cookie banner, analytics after consent
- [ ] Playwright e2e flows from TESTING.md against `API_MODE=mock`, at 320, 375, 768 and 1440 px, plus axe
- [ ] Real-device pass (RESPONSIVE.md §17) and the mobile performance budgets (§12)
- [ ] Lighthouse targets · QA §1, §11

### Optional: pre-launch site (if a gateway asks for a live site)

- [ ] After F2: deploy the frontend alone with `API_MODE=static` (DEPLOYMENT.md "Pre-launch site"): real content in the
      fixtures, policy pages reviewed, forms and online donation turned off, donate buttons show bank and merchant numbers.

---

## Backend

The frontend is finished at this point; each B phase makes one group of endpoints real and switches nothing in the pages.
The fixtures are the reference: every B phase adds the **contract test** (TESTING.md) for its endpoints.

### B1: Django setup, content and admin

- [ ] `backend/`: Django 5.2 project `config` (split settings), DRF, custom `accounts.User` **before the first migration**, Postgres, Redis, ruff, pytest, `GET /health/`
- [ ] Apps `core`, `content`, `engagement`, `audit`; Unfold admin, Groups and permissions (ADMIN.md); R2 storage
- [ ] Public content + form endpoints, error format, throttles, language resolution
- [ ] `manage.py seed` **from the frontend fixtures**; revalidate hook
- [ ] Run the site with `API_MODE=live` for these endpoints · QA §3, §9 (admin parts)

> **Prompt:** "Create `backend/` as in `docs/ARCHITECTURE.md` and `backend/CLAUDE.md`, with the custom `accounts.User` from `docs/DATA_MODEL.md` before the first migration. Implement the `core`, `content`, `engagement` and `audit` apps, the public content and form endpoints exactly as in `docs/API.md`, and their Unfold admin as in `docs/ADMIN.md`, with media on R2. Write `manage.py seed` that loads `frontend/src/mocks/fixtures/*.json`. Add pytest tests for every endpoint and group permission, and a contract test that compares each response with its fixture's keys and types."

### B2: Donations (sandbox)

- [ ] `donations`, `payments`, `notifications` apps; `mark_paid()`; WeasyPrint receipts; Celery
- [ ] SSLCommerz sandbox + IPN, bKash sandbox, SMS + email (console providers first)
- [ ] Admin: donations, offline donation, refund, resend, CSV export, dashboard · QA §4–5, §7

> **Prompt:** "Implement the donation backend exactly as `docs/DONATION_FLOW.md` describes, with the models and `mark_paid()` from `docs/DATA_MODEL.md` and the endpoints in `docs/API.md`, SSLCommerz sandbox first. A donation is only PAID after server-side validation; callbacks must be idempotent and logged as GatewayEvents. Write pytest tests for every case in `docs/QA_CHECKLIST.md` §4 with the gateway mocked (`responses`), including a parallel receipt-number test. The frontend must work unchanged with `API_MODE=live`."

### B3: Donor accounts

- [ ] OTP request/verify, simplejwt with rotation + blacklist, linking earlier donations, `me/*` endpoints, receipt PDF · QA §9

### B4: Recurring giving

- [ ] Subscription model, REMINDER mode first, AUTO for each method the gateway enables; Celery beat `charge_subscriptions` · QA §6

---

## L: Launch

- [ ] Zakat calculator and fitra form (frontend + backend), **only after ZAKAT_POLICY.md is signed**; then `zakat_enabled = true` · QA §8
- [ ] Real photos, logo, favicon, OG image
- [ ] Production server, backups + restore test, monitoring (DEPLOYMENT.md) · QA §12
- [ ] Full QA_CHECKLIST.md on staging with `API_MODE=live` and sandbox keys, then the launch-day steps · QA §13
