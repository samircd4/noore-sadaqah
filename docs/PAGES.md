# Page Specs — every page except home

Only the home page has a visual design (`design/reference/home.html`). Every other page is
**built from the same parts**: the components in `src/components/ui/*` and the patterns in
`DESIGN_SYSTEM.md`. Don't invent new styles: if a page needs something new, add it to
DESIGN_SYSTEM.md first.

## Shared page parts

| Part | Spec |
|---|---|
| **PageHero** (`components/layout/PageHero.jsx`) | Short version of the home hero: photo + `--overlay-hero`, `py-20 lg:py-28`, eyebrow + `h1` (`font-head text-3xl sm:text-4xl lg:text-5xl font-bold text-white`), optional one-line subtext, breadcrumb (`হোম / …`) in `text-sand-200`. Pages without a photo use a plain `bg-em-900` background. |
| **Section** | `py-14 lg:py-20`, `max-w-7xl mx-auto px-4`; alternate background `bg-sand-50` / `bg-sand-100`. |
| **SectionHeader** | Eyebrow + `h2`, as on home. |
| **DonateCta** (`components/donate/DonateCta.jsx`) | Gold band (`bg-gold-500 text-em-950`) with one line of text and a dark button to `/donate/[fund]`. Ends most content pages. |
| **EmptyState** (`components/ui/EmptyState.jsx`) | Icon + one line + optional button, centered, `text-em-900/70`. For empty lists. |
| **Pagination** (`components/ui/Pagination.jsx`) | Prev / page numbers in Bengali digits / Next, `rounded-lg`, current page `bg-em-700 text-white`. 12 items per page. |
| **Accordion** (`components/ui/Accordion.jsx`) | Use `<details>/<summary>` (no JS needed), `border-sand-200 rounded-lg`, chevron icon. For FAQs. |
| **Tabs** (`components/ui/Tabs.jsx`, client) | Underlined active tab `border-gold-500`, synced to `?tab=` in the URL. |
| **Breadcrumb** | `nav aria-label="breadcrumb"`, `text-sm`. |
| **MobileDonateBar** (`components/layout/MobileDonateBar.jsx`, client) | Sticky gold "দান করুন" bar below `lg`; in the layout; hide rules in RESPONSIVE.md §9. |

**Phone layouts:** every page below has its phone layout in **RESPONSIVE.md §15** (column order, sticky parts, tables as cards). Build the phone layout first.

Each page sets `generateMetadata` (title `… | নূরে সাদাকাহ ফাউন্ডেশন`, description, OG image).

---

## Public pages

### `/about` — পরিচিতি
1. PageHero: "আমাদের সম্পর্কে"
2. Story: two columns (text + photo collage reused from AboutPreview)
3. Mission & vision: two cards (`bg-em-50 border-em-100`)
4. Principles: the 3 value cards from the home page
5. Stats: reuse `Stats`
6. Board & advisors: grid of person cards (photo, name, role); 2 columns on mobile, 4 on desktop
7. Registration: registration number, authority, date, "সনদ ডাউনলোড করুন" (PDF) button
8. DonateCta

Data: `CONTENT.md` §1, 2, 6, 7.

### `/programs` — কার্যক্রম
1. PageHero
2. Grid of all `ProgramCard`s (same card as home), 1 / 2 / 3 columns
3. DonateCta

### `/programs/[slug]`
1. PageHero with the program cover photo and badge
2. Two columns on desktop (`lg:grid-cols-12`): **main (8)**: description, goals list (check icons), gallery strip, impact table; **sidebar (4, sticky)**: info card (beneficiaries, area, duration) + the linked fund's donate box (preset amounts → `/donate/[fund]?amount=`)
3. Impact by year: table on desktop; on mobile, stacked cards (year, metric, value)
4. FAQ: Accordion
5. Other programs: 3 cards
- `notFound()` for unknown slug. `generateStaticParams` from programs.

### `/campaigns/[slug]`
1. PageHero with cover photo, title, summary
2. Progress: raised / goal / percent, ProgressBar on `bg-em-900`, donor count, days left (or "চলমান" if no end date)
3. Monthly options (same chips as the home CampaignBanner) + one-time option → `/donate/[fund]?campaign=slug`
4. Story body
5. Recent donors: first name + amount + time ago, "নাম প্রকাশে অনিচ্ছুক" if anonymous. **Never show phone or email.**
- After `ends_at`: show "ক্যাম্পেইন শেষ হয়েছে" and the final total; disable the donate buttons.

### `/donate` — সব তহবিল
1. PageHero: "দান করুন"
2. Grid of `FundCard` (cover, title, summary, "দান করুন" gold button); zakat fund shows a "যাকাত গ্রহণযোগ্য" badge
3. Other ways to give: bank accounts and bKash/Nagad merchant numbers (copy button for each number)
4. Link to `/zakat-calculator`

### `/donate/[fund]` — একটি তহবিল + দানের ফর্ম
Two columns on desktop, form first on mobile.
- **Form (`DonateForm`, client):**
  1. One-time / monthly toggle (monthly hidden if `allow_recurring` is false)
  2. Amount chips (`preset_amounts`) + free amount (min `min_amount`); reads `?amount=` and `?campaign=`
  3. Name, mobile (`01XXXXXXXXX`), email (optional; required for card receipts by email)
  4. "অন্যের পক্ষ থেকে দান" checkbox → reveals `on_behalf_of` field
  5. "নাম প্রকাশ করবেন না" (anonymous) checkbox
  6. Payment method: bKash / card & other (SSLCommerz)
  7. Consent text with links to `/terms` and `/refund-policy`
  8. Submit button "পরবর্তী ধাপ" → `/donate/checkout` (form state kept in `sessionStorage`, never in the URL)
  - **Monthly requires login:** if not logged in, "মাসিক" sends the donor through `/login?next=…` and back, form kept.
  - **Fitra fund** (`is_fitra`): instead of amounts, a people-count input and an item select from `site.fitra.rates`; the
    total updates live; closed after `site.fitra.cutoff`. Built only after ZAKAT_POLICY sign-off.
- **Side:** fund story, cover, bank & merchant details for offline giving.
- Zakat fund: a box "যাকাত হিসাব করুন" linking to the calculator.

### `/donate/checkout`
Summary card: fund, amount (`taka()`), type (one-time/monthly), name, mobile, method. Buttons:
"পরিবর্তন করুন" (back) and "পেমেন্ট করুন" (gold). Submit calls the `createDonation` server action
(→ `POST /donations/`) and redirects to the gateway's `redirect_url`.
Show a loading state and prevent double submit. On `502 gatewayUnavailable` show "পেমেন্ট সেবা এই মুহূর্তে পাওয়া যাচ্ছে না, একটু পরে চেষ্টা করুন".

### `/donate/success?id=…`
Reads the donation with `GET /donations/{id}/status/` (never from query params alone).
- `PAID`: check icon, "জাযাকাল্লাহু খাইরান", amount, receipt no, "রসিদ ডাউনলোড" button, share buttons.
- `PENDING`: "আপনার পেমেন্ট যাচাই করা হচ্ছে…"; a small client component calls the `refreshDonation` server action
  (→ `POST /donations/{id}/refresh/`) every 5 seconds, 12 times, then shows "নিশ্চিত হলে এসএমএস পাবেন".
- Any other status: redirect to `/donate/failed?id=`.

### `/donate/failed?id=…`
"পেমেন্ট সম্পন্ন হয়নি", the reason if known, "আবার চেষ্টা করুন" (same form pre-filled from `sessionStorage`; if empty,
pre-fill fund and amount from the status response) and contact phone.

### `/zakat-calculator`
Until `site.zakat_enabled` is true (ZAKAT_POLICY sign-off) the page shows only the hero and "শীঘ্রই আসছে".
1. PageHero
2. Calculator (client): inputs listed in `ZAKAT_POLICY.md`, each with a help tooltip; live total; nisab value and the date it was set; result card "আপনার যাকাত: ৳…"; "এই পরিমাণ দান করুন" → `/donate/zakat?amount=`
3. Explanation and FAQ (text approved by the Shariah advisor)
4. Disclaimer: "এটি একটি সহায়ক হিসাব; বিশেষ ক্ষেত্রে আলেমের পরামর্শ নিন।"

### `/get-involved` — যুক্ত হোন
Tabs (`?tab=monthly|volunteer|careers`):
- **monthly**: benefits of monthly giving, the 3 amounts, button → `/donate/orphan?type=monthly`
- **volunteer**: form (name, phone, email, district select of 64 districts, skills, availability) → `Volunteer`
- **careers**: list of open positions, or EmptyState "এই মুহূর্তে কোনো পদ খালি নেই"

### `/news` — সংবাদ
1. PageHero
2. Category filter chips (`?category=`)
3. Grid of `NewsCard` (same as home), Pagination

### `/news/[slug]`
Cover photo, date (`bnDate()`), category badge, title, body (markdown → HTML, sanitized), share buttons, 3 related posts, DonateCta.

### `/gallery` — গ্যালারি
Category filter chips, photo/video toggle, masonry/grid of tiles, Pagination. Click opens a **Lightbox** (client: arrows, Esc to close, swipe on mobile, caption). Videos open a YouTube embed in the lightbox.

### `/contact` — যোগাযোগ
Two columns: **form** (name, phone or email, subject, message → `ContactMessage`, rate-limited) and **info** (address, phone, WhatsApp, email, office hours, social). Below: map embed (lazy-loaded), FAQ accordion.

### `/transparency` — স্বচ্ছতা
1. PageHero
2. Registration card (number, authority, certificate)
3. Reports table: year, type, "ডাউনলোড" (PDF)
4. Fund-wise totals by year (from PAID donations; zakat shown separately). A simple bar chart is optional; a table is required.
5. "আপনার দান কীভাবে খরচ হয়" text

### `/privacy`, `/terms`, `/refund-policy`
Simple text pages: PageHero (no photo) + `max-w-3xl` prose. Text from `POLICIES.md` after legal review. Show "সর্বশেষ হালনাগাদ: {date}".

### `/login`
Centered card on `bg-sand-50`. Step 1: phone or email (`login` server action → `POST /auth/otp/request/`).
Step 2: 6-digit code (→ `POST /auth/otp/verify/`; the server action stores the tokens in httpOnly cookies and
redirects to `?next=` or `/account`). Resend after 60 seconds, auto-focus, `inputMode="numeric"`,
`autocomplete="one-time-code"`. A small "স্টাফ লগইন" link goes to `/admin/` (Django).

### `not-found.jsx` and `error.jsx`
Friendly message, links to home and `/donate`. The error page shows no stack trace.

---

## Donor area (`/account`, login required)

### `/account`
- Header: "আসসালামু আলাইকুম, {name}"
- Summary cards (StatCard): total given this year, number of donations, active monthly plans
- Donations table: date, fund, amount, method, status Badge, receipt download. On mobile, a card list.
- Profile: name, email (phone is the login, not editable here)

### `/account/recurring`
Card per subscription: fund, amount, next charge date, method, status. Actions: pause, resume, cancel (confirm dialog), change amount (applies from the next charge).

### `/account/receipts/[id]`
Route handler that streams `GET /me/donations/{id}/receipt/` with the donor's token. Not your donation → 404.

### Logout
Header menu "লগআউট" → server action → `POST /auth/logout/`, delete both cookies, redirect to `/`.

---

## Admin

Staff use **Django admin at `/admin/`** (DECISIONS.md D4). Screens, permissions and workflows: `ADMIN.md`.
There are no admin pages in Next.js.

## Where each page gets its data

| Page | Endpoints (API.md) |
|---|---|
| Layout (header, footer) | `GET /site/` |
| `/` | `/site/`, `/funds/`, `/programs/?featured=1`, `/campaigns/?featured=1`, `/gallery/?limit=6&kind=photo`, `/posts/?limit=3` |
| `/about` | `/site/`, `/people/`, `/reports/?kind=registration` |
| `/programs`, `/programs/[slug]` | `/programs/`, `/programs/{slug}/` |
| `/campaigns/[slug]` | `/campaigns/{slug}/` |
| `/donate`, `/donate/[fund]` | `/funds/`, `/funds/{slug}/`, `/site/` (mobile banking, fitra) |
| `/donate/checkout` | none (form state); submit → `POST /donations/` |
| `/donate/success`, `/donate/failed` | `GET /donations/{id}/status/`, `POST /donations/{id}/refresh/` |
| `/zakat-calculator` | `/site/` (`nisab`, `zakat_enabled`) |
| `/get-involved` | `/jobs/`; volunteer form → `POST /volunteers/` |
| `/news`, `/news/[slug]` | `/posts/`, `/post-categories/`, `/posts/{slug}/` |
| `/gallery` | `/gallery/`, `/post-categories/` |
| `/contact` | `/site/`; form → `POST /contact/` |
| `/transparency` | `/site/`, `/reports/`, `/transparency/totals/` |
| `/login` | `POST /auth/otp/request/`, `POST /auth/otp/verify/` |
| `/account`, `/account/recurring` | `/me/`, `/me/summary/`, `/me/donations/`, `/me/subscriptions/` |
