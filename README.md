# Noore Sadaqah Foundation website

Website for নূরে সাদাকাহ ফাউন্ডেশন: programs, funds, one-time and monthly donations, news, gallery,
donor accounts and a staff admin. Bengali first, English second.

**Status:** planning and design docs only; no code yet. Start with `docs/ROADMAP.md`.

## Repo layout

```
CLAUDE.md            Shared rules for AI coding assistants (read automatically by Claude Code)
README.md            This file
design/
  tokens.css         Color palette, fonts, shadows, overlays (Tailwind v4) ← edit colors here
  tailwind.config.js Reference copy for Tailwind v3 / CDN (not used by the build)
  reference/home.html  Approved home page design (open it in a browser)
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
