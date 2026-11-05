# Decision Log

Short records of decisions that shape the project. **AI assistants: don't reopen a decision listed
here as "Decided" unless the user asks.** To change one, add a new entry that replaces it; don't edit old entries.

Format: number, date, status, decision, why, consequences.

---

## D1. Backend in Django + DRF; frontend in Next.js (2026-11-04, Decided)

**Decision:** Two apps in one repo. `backend/` is Django + Django REST Framework (Python). `frontend/` is Next.js (JavaScript).
**Why:** The developer works fastest in Django. Django admin gives the staff area almost for free. Python has
WeasyPrint for Bengali PDF receipts and Celery for background jobs.
**Replaces:** the single Next.js app with Prisma, Auth.js and server-action writes.
**Consequences:** An API contract is needed (`API.md`). Next.js never touches the database. The "JavaScript only" rule
now applies to `frontend/` only.

## D2. Next.js 16 (2026-11-04, Decided)

**Decision:** Next.js 16, App Router, JavaScript (no TypeScript), Tailwind CSS v4.
**Why:** Current stable release. Starting on 15 would mean an upgrade before launch.
**Consequences:** Route protection lives in `src/proxy.js` (Next 16's replacement for `middleware.js`).
Request APIs (`cookies()`, `headers()`, `params`, `searchParams`) are async and must be awaited.

## D3. JWT auth, stored in httpOnly cookies by the Next.js server (BFF) (2026-11-04, Decided)

**Decision:** Django issues JWTs (`djangorestframework-simplejwt`). The Next.js server receives them and stores them in
`httpOnly; Secure; SameSite=Lax` cookies. Browser JavaScript never sees a token. Next.js calls DRF
server-to-server with `Authorization: Bearer <access>`.
**Why:** XSS can't steal the tokens, and server components can fetch donor data.
**Rejected:** localStorage tokens (XSS risk on a payments site); DRF setting cookies directly (needs CORS/CSRF work).
**Consequences:** All donor-authenticated calls go through Next server actions or route handlers. See `SECURITY.md`.

## D4. Staff use Django admin + Unfold (2026-11-04, Decided)

**Decision:** No custom `/admin` in Next.js. Staff work in Django admin at `/admin/`, themed with `django-unfold`.
Staff log in with Django's session login (email + password), not JWT.
**Why:** Saves weeks of work. Lists, filters, search, permissions, CSV export and history come built in.
**Consequences:** `ADMIN.md` is a Django admin spec. Roles are Django Groups.

## D5. Celery + Redis + celery-beat for background and scheduled jobs (2026-11-04, Decided)

**Decision:** SMS, email, receipt generation, subscription charging and pending cleanup run as Celery tasks;
schedules use `django-celery-beat`.
**Why:** A slow SMS gateway must never delay a payment callback, and failed sends need automatic retries.
**Replaces:** the `/api/cron/*` routes and crontab.

## D6. Media on Cloudflare R2 (2026-11-04, Decided)

**Decision:** Uploaded images, receipt PDFs (if cached) and report PDFs are stored on Cloudflare R2 through
`django-storages` (S3 API). Public images are served from a public R2 bucket domain (e.g. `media.nooresadaqah.org`);
private files use signed URLs.
**Why:** Survives a VPS rebuild, has no egress fees, and works with `next/image`.

## D7. Hosting on a Hostinger VPS (2026-11-04, Decided)

**Decision:** One Ubuntu VPS runs Nginx, Next.js, Gunicorn/Django, Celery worker, Celery beat, PostgreSQL and Redis.
**Why:** Fixed price, fixed IP (some gateways ask for IP whitelisting), everything in one place.
**Rejected:** Vercel (two hosts for two apps, Pro plan needed for a donation site).
**Consequences:** Backups, OS updates and monitoring are our job. See `DEPLOYMENT.md` and `RUNBOOK.md`.

## D8. Monorepo (2026-11-04, Decided)

**Decision:** One git repo: `frontend/`, `backend/`, plus shared `docs/` and `design/` at the root. Each app has its
own `CLAUDE.md`; the root `CLAUDE.md` holds the shared rules.
**Why:** One AI session can see both sides of an API change, and the docs are not duplicated.

## D9. Same origin for site, API and admin (2026-11-04, Decided)

**Decision:** Nginx serves `https://nooresadaqah.org/` → Next.js, `/api/` and `/admin/` → Django.
**Why:** No CORS, simpler cookies, and payment callback URLs sit on the main domain that the gateways approved.

## D10. v1 launch scope (2026-11-04, Decided)

**In v1:** one-time online donations (SSLCommerz + bKash), monthly recurring giving, donor accounts with OTP login,
English version, zakat calculator.
**Risks recorded:**
- The zakat calculator and fitra form can't ship until `ZAKAT_POLICY.md` is signed off (blocked on the foundation).
- Recurring charges need bKash tokenized-agreement approval and SSLCommerz card tokenization. If either is not granted
  in time, v1 uses **reminder-based monthly giving** for that method (see `DONATION_FLOW.md`).
- English needs a translator (see D-open-1).

## D11. Bengali PDF receipts with WeasyPrint (2026-11-04, Decided)

**Decision:** Receipts are HTML templates rendered to PDF by WeasyPrint, with Noto Sans/Serif Bengali embedded.
**Why:** WeasyPrint shapes text with HarfBuzz, so Bengali conjuncts render correctly. `@react-pdf/renderer` does not shape them reliably.

## D12. Staff roles as Django Groups: Admin, Editor, Accountant (2026-11-04, Proposed)

**Proposal:** Add an `Accountant` group (donations and offline entries; no content, users or settings).
It costs almost nothing in Django. **Waiting for the foundation to confirm.** Until then build all three groups;
leave Accountant empty if not wanted.

## D13. Frontend first, against a mock API (2026-11-04, Decided)

**Decision:** Build the whole Next.js site first (every page, including the donation flow, OTP login and `/account`)
against an in-process mock of `API.md` inside `frontend/src/lib/api.js` (`API_MODE=mock`). Django is built afterwards
and replaces the mock endpoint group by endpoint group (`API_MODE=live`).
**Why:** The site's look and flows can be reviewed by the foundation early; the API contract gets tested by real pages
before any backend code exists; frontend and backend work don't block each other.
**Consequences:**
- The mock must return exactly the API.md shapes and error codes, or the switch to Django breaks pages. Changing an
  endpoint means changing API.md, the fixture and the handler in one commit.
- The fixtures double as the Django seed data (`manage.py seed` loads them) and as the reference for a backend
  contract test.
- A third mode, `API_MODE=static`, serves the fixtures read-only for an early pre-launch site.
- Payment, receipt, SMS and security behaviour can only be truly tested once Django exists (QA_CHECKLIST.md note).
- **Replaces:** the old roadmap order, where the backend started after the static pages.

## D14. Mobile: 320px minimum and a sticky donate bar (2026-11-04, Decided)

**Decision:** The site must look right from **320px** wide (not only "no horizontal scroll"). Phones and tablets
(below 1024px) get a **sticky "দান করুন" bar** at the bottom of the screen. Full spec: `RESPONSIVE.md`.
**Why:** Most donors are on phones, many on budget Android devices and in Facebook/WhatsApp in-app browsers; the
approved design's header and some sections don't fit on phones. A visible donate button on every scroll position is a
common, effective pattern for charity sites.
**Consequences:**
- The sticky bar is a **design addition** to `design/reference/home.html` (HOME_PAGE.md fix 15); its hide rules are in RESPONSIVE.md §9.
- The phone header differs from the design (HOME_PAGE.md fix 16).
- Inputs are 44px tall instead of the design's 42px (touch target and no iOS zoom).

## D15. Next.js 16.4 defaults kept; `master` branch (2026-11-04, Decided)

**Decision:** Keep the create-next-app defaults of Next.js 16.4: **Cache Components** (`cacheComponents: true`) and
Partial Prefetching. Public content is cached with `"use cache"` + `cacheTag`; the locale comes from
`next/root-params`. The default git branch is **`master`**.
**Why:** Cache Components becomes the only model in the next major version; starting on it avoids a migration.
**Consequences:** `src/lib/api.js` has two functions, `apiGet()` (cached, no request headers) and `apiRequest()`
(uncached). Next.js must run with `HOSTNAME=localhost` in production (DEPLOYMENT.md).


## D16. Every URL carries its language: `/bn/...` and `/en/...` (2026-11-05, Decided)

**Decision:** next-intl `localePrefix: "always"`. Bengali pages live under `/bn/...`; `/` and any unprefixed URL
(old links, typed addresses) redirect to the Bengali page. Still no redirect by browser language (`localeDetection: false`).
**Why:** with `"as-needed"` (Bengali without a prefix) Next.js 16 link prefetching took one-part URLs such as
`/about` for the home route with `locale = "about"` and got 404s (about 6 per page view, F2 QA). Changing URLs costs
nothing before launch.
**Consequences:** `localizedPath()` (SEO) returns `/bn/...`; canonical and `x-default` point to `/bn/...`. Django
redirects donors back to `/{locale}/donate/...` (API.md "Payments"). Links built with next-intl's `<Link>` need no change.

---

## Open decisions (foundation must answer; don't guess)

| # | Question | Blocks | Owner |
|---|---|---|---|
| open-1 | Who writes and approves the English translations? | English at launch | Foundation |
| open-2 | Shariah advisor sign-off on `ZAKAT_POLICY.md`, with a date | Zakat calculator, fitra, zakat texts | Shariah advisor |
| open-3 | Lawyer/board review of `POLICIES.md` | Gateway go-live | Board |
| open-4 | Admin-cost percentage (Terms §4) and the tax-deductibility statement | Terms page, receipts | Board, accountant |
| open-5 | Accountant role (D12) | Admin groups | Chairman |
| open-6 | Domain, VPS, SMS sender ID, R2 account, mailbox: who buys them, and in whose name (the foundation's, not the developer's) | Staging deploy | Foundation |
| open-7 | How long donation records are kept (Privacy §7) | Privacy page | Accountant |
