# QA Checklist

Run the relevant section at the end of each roadmap phase, and the whole list on staging before going live.
Record failures as issues; don't tick a box you haven't checked. How to automate each part: `TESTING.md`.
Items marked 🤖 must also exist as automated tests (pytest or Playwright).

**Frontend-first note (DECISIONS.md D13):** with `API_MODE=mock` you can check §1–3, §11 and the **UI** parts of §4–9
(pages, messages, redirects, polling, login screens, account pages). Anything about real payments, receipt numbers,
PDFs, SMS, throttles by real IP, permissions or security headers on Django is only checked with `API_MODE=live`.
Don't tick those boxes in mock mode.

## 1. Every page

- [ ] **320**, 360, 375, 768, 1024, 1440px and phone landscape (640×360): no overlap, no clipped Bengali text, no horizontal scroll (`document.documentElement.scrollWidth === innerWidth`) 🤖
- [ ] RESPONSIVE.md §18 definition of done met (touch targets ≥ 44px, right keyboards, 16px inputs, `sizes` on images)
- [ ] Sticky donate bar: visible below 1024px, hidden on the routes and in the states listed in RESPONSIVE.md §9, never covers content 🤖
- [ ] Real devices: a budget Android (Chrome and Samsung Internet), an iPhone (Safari), and a link opened from Facebook Messenger or WhatsApp
- [ ] Browser text size 200% / Android largest font: nothing clipped or overlapping
- [ ] Header, mobile menu (opens, closes with Esc and by tapping outside, focus stays inside), footer
- [ ] Bengali text renders in Noto Sans/Serif Bengali (no fallback boxes), numbers in Bengali digits
- [ ] Keyboard only: every link and button is reachable with Tab and shows the gold focus ring
- [ ] Images have Bengali `alt`; decorative images have `alt=""`
- [ ] Page title and description set; OG image shows when the link is shared on Facebook/WhatsApp
- [ ] No console errors; no `blue-*`, `yellow-*`, `gray-*` or raw hex in the frontend code (`grep -rE "#[0-9a-fA-F]{3,6}\b|(blue|yellow|gray)-[0-9]" frontend/src/`) 🤖
- [ ] English version (`/en/...`) has no missing keys (`npm run i18n:check`) and no Bengali UI labels 🤖
- [ ] Page still renders (with cached data or a friendly message) when Django is stopped

## 2. Home page (HOME_PAGE.md acceptance)

- [ ] Side by side with `design/reference/home.html` at 1440px: same look
- [ ] All fixes in HOME_PAGE.md are applied
- [ ] Quick-donate panel doesn't cover the stats at 320 and 375px; chips are a 2×2 grid on phones
- [ ] Phone header fits at 320px (RESPONSIVE.md §8); every section matches its row in RESPONSIVE.md §14
- [ ] Amount chips act as a radio group; the free amount updates the selection
- [ ] Video button opens a modal; the video stops when the modal closes

## 3. Forms

For quick-donate, donate, contact, volunteer, newsletter, login:
- [ ] Empty submit shows Bengali errors next to each field (English on `/en`)
- [ ] Mobile: `01712345678` ✅; `+8801712345678` and `০১৭১২৩৪৫৬৭৮` (Bengali digits) are normalised and accepted; `0171234567`, `02123456789` ❌ 🤖
- [ ] Amount: below the fund minimum ❌, `১০০০` (Bengali digits) ✅, `10.5` ❌, `-5` ❌, `1e9` ❌, empty ❌ 🤖
- [ ] Django rejects invalid data when called directly, skipping Next.js (curl to `127.0.0.1:8000` on the server, or pytest) 🤖
- [ ] Double-click on submit sends only one request
- [ ] Rate limit: the 6th contact message from one IP within 10 minutes is refused politely 🤖
- [ ] Throttles count the **visitor's** IP, not the Next.js server's: two different visitors are not blocked by each other
- [ ] From outside, `https://nooresadaqah.org/api/v1/funds/` returns 404 (only payments, receipts and health are public)

## 4. One-time donation, SSLCommerz sandbox

Use the SSLCommerz sandbox test cards and mobile banking test accounts from their developer docs.

- [ ] Success: status PENDING → PAID only after validation; receipt number `NSF-2026-000001` format; SMS + email sent; success page shows PAID 🤖
- [ ] Fail: donation becomes FAILED; failed page shows "আবার চেষ্টা করুন" with the form pre-filled
- [ ] Cancel at the gateway: CANCELLED; no receipt
- [ ] Open `/donate/success?id=<pending id>` directly **without paying**: it must **not** show PAID 🤖
- [ ] Send the same IPN twice: still one PAID donation, one receipt number, one SMS 🤖
- [ ] IPN with a changed amount: **not** marked PAID; mismatch logged as a GatewayEvent and the admin alerted 🤖
- [ ] IPN with a fake `val_id`: rejected by the Validation API; not PAID 🤖
- [ ] IPN arrives before the browser success POST, and the other way round: both end in PAID, once 🤖
- [ ] Close the browser on the gateway page: the IPN still marks it PAID; the donor gets the SMS
- [ ] Whole flow inside the Facebook / Messenger in-app browser on a phone: redirect to the gateway and back works
- [ ] PENDING older than 24 hours is settled by `cleanup_pending` (after one gateway query) 🤖
- [ ] Gateway timeout on initiate: friendly error, donation stays PENDING

## 5. One-time donation, bKash sandbox

- [ ] Success, wrong PIN, wrong OTP, insufficient balance, cancel, timeout
- [ ] Execute is called once; Query Payment confirms before PAID 🤖
- [ ] Execute times out: Query Payment decides, Execute is not repeated 🤖
- [ ] Callback repeated: idempotent 🤖

## 6. Monthly giving

- [ ] Monthly requires login; the form survives the login round-trip
- [ ] First payment creates a Subscription with the right `mode`, `anchor_day` and `next_charge_on` one month later 🤖
- [ ] Run `charge_subscriptions` with frozen time (`freezegun` / `time_machine`): a new PAID donation linked to the subscription; `next_charge_on` moves one month 🤖
- [ ] Anchor day 31: Jan 31 → Feb 28/29 → Mar 31 🤖
- [ ] AUTO failed charge: `fail_count` +1, retry after 3 days; after 3 failures FAILED + SMS 🤖
- [ ] REMINDER: pay link sent on the due date, reminder after 3 days, counts as failed after 7 days 🤖
- [ ] Task run twice the same day, or by two workers at once: no double charge 🤖
- [ ] Only one `celery beat` process is running in production
- [ ] Pause / resume / cancel / change amount from `/account/recurring`; cancel also cancels the bKash agreement; resume never charges for paused months 🤖
- [ ] The site never says "automatic" for a REMINDER plan

## 7. Receipts

- [ ] PDF shows: foundation name, registration no., receipt no., date (Bengali), donor name, on-behalf-of name, fund, amount in digits **and in Bengali words**, method, txn ID
- [ ] Bengali text renders correctly in the PDF (embedded font, conjuncts like ক্ষ, ন্ত, র্থ intact): check by eye and by `pdftotext` 🤖
- [ ] Another donor's receipt id returns 404; an SMS link with a wrong or expired token returns 404 🤖
- [ ] Receipt numbers have no gaps or duplicates when 20 donations are paid at the same time (parallel test against real Postgres) 🤖
- [ ] Refunded donation's PDF says "ফেরতকৃত"; receipt number unchanged
- [ ] `amount_in_words_bn`: 1, 15, 100, 1500, 100000 (এক লক্ষ), 12500000 (এক কোটি পঁচিশ লক্ষ) 🤖

## 8. Zakat calculator and fitra (after ZAKAT_POLICY.md sign-off)

- [ ] Example cases signed off by the Shariah advisor, with expected results, all pass (add them here) 🤖:
  - [ ] Case 1: TODO
  - [ ] Case 2: below nisab → zakat 0 and the right message
  - [ ] Case 3: debts larger than assets → zakat 0
- [ ] Bhori/tola ↔ gram conversion 🤖
- [ ] "এই পরিমাণ দান করুন" fills the zakat fund form
- [ ] Nisab rate date is shown
- [ ] Nothing typed in the calculator is sent to the server (check the network tab)
- [ ] Fitra: amount = people × rate computed by the server; closed after the cutoff 🤖
- [ ] With `zakat_enabled = false` the calculator and fitra form are hidden

## 9. Accounts & admin

- [ ] OTP: expires after 5 minutes, max 5 attempts, resend once every 60 seconds and 5 per hour per target; code stored hashed 🤖
- [ ] OTP request for an unknown and a known phone gives the same answer 🤖
- [ ] OTP login refuses staff accounts 🤖
- [ ] Donor sees only their own donations and subscriptions (another id → 404) 🤖
- [ ] JWT cookies are `HttpOnly`, `Secure`, `SameSite=Lax`; `document.cookie` doesn't show them
- [ ] Expired access token is refreshed by `proxy.js`; reused old refresh token is rejected (rotation + blacklist) 🤖
- [ ] Logout blacklists the refresh token 🤖
- [ ] `/admin/` as a donor → login page; each group sees exactly the screens in the ADMIN.md matrix 🤖
- [ ] Editor can't see donor phone/email or export CSV; custom actions check permissions server-side 🤖
- [ ] Admin and Accountant logins require TOTP; lockout after 5 failed logins
- [ ] Offline donation: receipt number, SMS, audit log entry; duplicate warning works
- [ ] Refund: totals and campaign progress go down; audit log entry
- [ ] Zakat donation's fund can't be changed, even by a superuser 🤖
- [ ] Nobody can delete a donation, subscription, gateway event or audit row 🤖
- [ ] CSV opens in Excel with correct Bengali; export is in the audit log
- [ ] Saving a program in the admin updates the public page within seconds (revalidate hook)

## 10. Security

- [ ] No secret in the client bundle: search `frontend/.next/static` for the store password, bKash secret, JWT key, R2 key, `REVALIDATE_SECRET`
- [ ] `python manage.py check --deploy` is clean
- [ ] Security headers on both apps: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, CSP with `frame-ancestors 'none'` (allows only the gateway, YouTube, map and media domains) (SECURITY.md)
- [ ] Rich text (news body) is sanitized: `<script>` or `onerror=` in a post body doesn't run 🤖
- [ ] Image upload rejects non-images and files over 5 MB 🤖
- [ ] `/internal/revalidate` without the secret → 401; from outside → 404
- [ ] Sentry events contain no phone, email, OTP or token (send a test error with a donor in context)
- [ ] `npm audit` and `pip-audit` have no high/critical issues 🤖

## 11. Performance & SEO

- [ ] Lighthouse mobile on home, `/donate/[fund]`, `/programs/[slug]`: Performance ≥ 85, Accessibility ≥ 95, Best practices ≥ 90, SEO ≥ 95
- [ ] Mobile budgets in RESPONSIVE.md §12 (LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, JS ≤ 150 KB gzipped per page)
- [ ] YouTube and map load only after a tap
- [ ] Hero image uses `preload`; others lazy-load; images come from the R2 domain through `next/image`
- [ ] `sitemap.xml` and `robots.txt` are correct; staging has `noindex` and basic auth
- [ ] 404 page works

## 12. Operations

- [ ] Backup ran last night, is encrypted and is on R2
- [ ] **Restore tested** on a scratch database; row counts match (RUNBOOK.md)
- [ ] Killing `noore-worker` and starting it again: queued SMS still go out
- [ ] Rebooting the VPS: all services come back on their own
- [ ] Uptime monitor alerts the right person when `/api/v1/health/` fails

## 13. Launch (see DEPLOYMENT.md "Launch day")

- [ ] CONTENT.md has no 🟡/❌ items left on visible pages
- [ ] POLICIES.md reviewed by the lawyer and published
- [ ] ZAKAT_POLICY.md signed off (or zakat/fitra hidden with `zakat_enabled = false`)
- [ ] Live keys, live callback URLs, one real ৳10 donation per method, refunded
- [ ] Uptime monitor and error tracking alerting the right person
