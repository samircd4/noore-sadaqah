# frontend/CLAUDE.md: Next.js 16 app

Read the root `../CLAUDE.md` first; its hard rules apply here too. This file adds the frontend rules.

## Stack

Next.js 16 (App Router) · **JavaScript only** (`.js`/`.jsx`, JSDoc for types, `jsconfig.json` for `@/*`) ·
Tailwind CSS v4 with `../design/tokens.css` · next-intl · Zod + react-hook-form · lucide-react.

## Rules

1. **Server components by default.** Add `"use client"` only for interactive parts (forms, menus, lightbox, modal,
   calculator, tabs, polling). Keep client components small; pass data in as props.
2. **All data comes from Django through `src/lib/api.js`**, called from server code only (server components, server
   actions, route handlers, `proxy.js`). Never `fetch` Django from a client component, and never put
   `API_INTERNAL_URL` in client code. Only call endpoints listed in `../docs/API.md`.
3. **No `/api/*` routes in Next.js** (Nginx sends `/api/` to Django). Allowed route handlers:
   `[locale]/account/receipts/[id]/route.js` and `internal/revalidate/route.js`.
4. **Writes go through server actions** in `src/lib/actions/*.js`: validate with the Zod schema from
   `src/lib/validation/`, call Django, map DRF errors to message keys, return `{ ok, fieldErrors, error }`.
5. **Tokens live only in httpOnly cookies** (`ns_access`, `ns_refresh`) read and written by `src/lib/session.js`.
   Never return a token to the browser or store one in `localStorage` (`../docs/SECURITY.md` §2).
6. **Next 16 specifics:** route protection and token refresh live in `src/proxy.js` (not `middleware.js`).
   `params`, `searchParams`, `cookies()` and `headers()` are async: `const { slug } = await params`.
7. **Caching (Cache Components are on):** public content goes through `apiGet(path, { locale, tags })`, which is
   cached with `"use cache"` + `cacheTag` + `cacheLife`; pass the tags listed in API.md. Writes, donation status and
   donor data (`/me/*`) go through `apiRequest()`, which is never cached. Never call `headers()` or `cookies()` inside
   a `"use cache"` scope: read them outside and pass values in. Uncached data in a page goes inside `<Suspense>`.
8. **Every call sends** `Accept-Language` (the locale you pass; read it with `locale()` from `next/root-params` in server
   components). `apiRequest()` also forwards `X-Forwarded-For` from the incoming request.
9. **Reuse `src/components/ui/*`** (Button, Badge, SectionHeader, StatCard, ProgressBar, Input, Select, EmptyState,
   Pagination, Accordion, Tabs, Breadcrumb) before writing new markup. One component per file, PascalCase.
10. **Styling:** only palette tokens (`em-*`, `sand-*`, `gold-*`); `rounded-lg` everywhere; headings `font-head`.
    Clickable things are real `<a>`/`<button>` elements: they get the pointer cursor globally (DESIGN_SYSTEM.md "Interaction").
    Text on gold is `text-em-950`. See `../docs/DESIGN_SYSTEM.md`.
11. **Text:** every UI label in `messages/bn.json` **and** `messages/en.json` (same keys). Numbers with `bnNumber()`,
    money with `taka()`, dates with `bnDate()` from `src/lib/format.js`. Convert input digits with `toLatinDigits()` before Zod.
12. **Images:** `next/image` with Bengali `alt` (from the API's `alt` field) and a **`sizes` value from `../docs/RESPONSIVE.md` §12**; the R2 host is in `images.remotePatterns`.
    The hero image uses `preload` (Next 16 replaced `priority`).
13. **HTML from the API** (`body_html`) is already sanitized by Django; render it only in the prose component. Never
    inject any other HTML.
14. **Each page** has `generateMetadata` (SEO_ANALYTICS.md) and handles a 404 from the API with `notFound()`.
15. **Mobile first, down to 320px:** follow `../docs/RESPONSIVE.md`. Unprefixed classes are the phone layout; check at 320, 375, 768 and 1440; meet its definition of done (§18). Use the z-index tokens (`z-(--z-header)` …), never raw z values.
16. **Next.js 16.4 differs from older versions.** Before using an API you are unsure of, read the bundled docs in
   `node_modules/next/dist/docs/` (see `AGENTS.md`). The locale comes from `next/root-params` (the `[locale]` root
   segment); don't use next-intl's deprecated `setRequestLocale`.

## Commands

```bash
npm run dev            # http://localhost:3000 (API_MODE=mock: no backend needed)
npm run lint
npm run test           # Vitest
npm run i18n:check     # bn/en key parity
npm run build
```

## Mock API (`API_MODE=mock`)

The frontend is built before Django (DECISIONS.md D13; modes in `../docs/ARCHITECTURE.md` "API modes").

1. **The mock implements `../docs/API.md` exactly**: paths, status codes, JSON shapes, error shape and codes,
   pagination, `Accept-Language` resolution of `{bn, en}` fixture fields. If a page needs data the contract doesn't
   have, change API.md first.
2. **Only `src/lib/api.js` reads `src/mocks/`.** Pages, components and server actions never import fixtures or
   check `API_MODE`. The single exception is `[locale]/donate/mock-gateway`, which returns `notFound()` unless mocked.
3. **A new or changed endpoint = API.md + fixture + handler (+ Vitest test) in one commit.**
4. Mock writes live in `src/mocks/store.js` (in memory). Mock validation reuses the Zod schemas from
   `src/lib/validation/` and returns DRF-style errors, so form error handling is real.
5. Mock auth: OTP code `123456` (logged to the server console), access tokens valid 2 minutes, refresh 1 day. Tokens
   still go into httpOnly cookies exactly as in live mode.
6. Fixtures hold **real foundation content once CONTENT.md confirms it**; placeholders stay marked so the launch
   check can find them. Django's `manage.py seed` loads these files later.
7. `API_MODE=static` (pre-launch): reads work, every write returns `503 {"error": {"code": "comingSoon"}}` and the UI
   shows "শীঘ্রই চালু হবে".
