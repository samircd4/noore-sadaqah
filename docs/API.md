# API Contract (Django REST Framework)

The contract between `frontend/` and `backend/`. **Change this file first**, then both apps, in the same commit.

## Conventions

| Topic | Rule |
|---|---|
| Base URL | `/api/v1/`. The Next.js server calls `API_INTERNAL_URL` (`http://127.0.0.1:8000/api/v1`). Only `payments/`, `receipts/` and `health/` are reachable from the internet (ARCHITECTURE.md). |
| Format | JSON, UTF-8. Field names are **snake_case** on the wire and in the frontend (no case conversion layer). |
| Money | Integer taka (`"amount": 1000`). |
| Dates | ISO 8601 with offset, UTC (`"2026-11-04T04:00:00Z"`). The frontend formats them in `Asia/Dhaka`. |
| Language | Request header `Accept-Language: bn` or `en`. Content endpoints return **already-resolved** fields (`title`, `summary` …) in that language, with Bengali as the fallback for missing English (I18N.md). |
| Auth | `Authorization: Bearer <access JWT>` for `me/*`. Public endpoints need no auth. |
| Client IP | Next.js sends `X-Forwarded-For: <visitor IP>`; Django trusts it only from `127.0.0.1`. |
| Pagination | `?page=N`, 12 items per page: `{ "count", "page", "pages", "results": [...] }`. |
| Images | `{ "url", "alt", "width", "height" }`. `url` is on `NEXT_PUBLIC_MEDIA_HOST`. |
| Mock | `frontend/src/mocks/` implements this whole contract for frontend-first work (ARCHITECTURE.md "API modes") and must change in the same commit as this file. Mock-only behaviour: `POST /donations/` returns `redirect_url: "/donate/mock-gateway?id=…"`; the OTP code is always `123456`; in `static` mode every write returns `503 comingSoon`. |
| Caching | Public GETs send `Cache-Control: public, max-age=60`. Next.js caches with tags (listed per endpoint) and Django triggers `/internal/revalidate` on admin saves. |

### Errors

All errors use one shape. `code` values are **I18N message keys without the `errors.` prefix**, so the frontend translates
them (`errors.mobileInvalid`):

```json
{ "error": { "code": "validation", "fields": { "donor_phone": ["mobileInvalid"], "amount": [{"code": "minAmount", "min": 10}] } } }
{ "error": { "code": "throttled", "retry_after": 42 } }
{ "error": { "code": "notFound" } }
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `validation` | Field errors in `fields`, each a key or `{code, …params}` |
| 401 | `authRequired` / `tokenInvalid` | Missing or expired access token |
| 403 | `forbidden` | Not your resource |
| 404 | `notFound` | Unknown slug or id |
| 409 | `conflict` | Action not allowed in the current state (e.g. resume a cancelled plan, campaign ended) |
| 429 | `throttled` | Rate limit; `retry_after` in seconds |
| 502 | `gatewayUnavailable` | SSLCommerz/bKash didn't answer |
| 503 | `comingSoon` | Frontend `static` mode only: writes are turned off on the pre-launch site |

Field error keys used: `required`, `mobileInvalid`, `emailInvalid`, `minAmount`, `maxAmount`, `amountInvalid`,
`fundInactive`, `recurringNotAllowed`, `campaignEnded`, `onBehalfPermission`, `otpInvalid`, `otpExpired`,
`otpTooManyAttempts`, `fitraClosed`, `tooLong`. Every key must exist in both `messages/*.json`.

### Throttles (DRF `ScopedRateThrottle`, Redis cache)

| Scope | Rate | Key |
|---|---|---|
| `otp_request` | 1/60s and 5/hour per target; 20/hour per IP | target and IP |
| `otp_verify` | 10/10min per IP | IP (plus 5 attempts per code in the model) |
| `donation_create` | 10/10min per IP | IP |
| `forms` (contact, volunteer, subscribe) | 5/10min per IP | IP |

---

## Public content

### `GET /site/`  · tags `site`
Everything the layout needs, one call per page render (cached).
```json
{
  "stats": [{"value": 12500, "suffix": "+", "label": "উপকারভোগী পরিবার"}],
  "contact": {"address": "ঢাকা, বাংলাদেশ", "phone": "+8801…", "whatsapp": "", "email": "info@…", "hours": "", "map_embed_url": ""},
  "social": {"facebook": "", "youtube": "", "instagram": "", "linkedin": ""},
  "quote": {"text": "সাদাকাহ সম্পদ কমায় না — বরং বরকত বাড়ায়।", "source": "হাদীসের মর্মার্থ · সহীহ মুসলিম"},
  "registration": {"authority": "", "number": "", "date": null, "certificate_url": null},
  "mobile_banking": [{"service": "bkash", "number": "", "type": "merchant"}],
  "payment_methods": ["bkash", "sslcommerz"],
  "promo_video": {"youtube_id": ""},
  "nisab": {"silver_price_per_gram": 0, "gold_price_per_gram": 0, "karat": "22K", "updated_at": null},
  "fitra": {"year": 2027, "rates": [{"item": "গম", "amount": 0}], "cutoff": null, "open": false},
  "zakat_enabled": false
}
```
`zakat_enabled` stays `false` until ZAKAT_POLICY.md is signed off (a SiteSetting flag set by an Admin).

### `GET /funds/` · `GET /funds/{slug}/` · tags `funds`
```json
{"slug": "zakat", "title": "যাকাত", "summary": "…", "body_html": "<p>…</p>", "cover": {…image},
 "preset_amounts": [100, 200, 500, 1000], "min_amount": 10, "is_zakat_eligible": true, "is_fitra": false,
 "allow_recurring": true, "bank_details": [{"bank": "", "account_name": "", "branch": "", "number": "", "routing": "", "swift": ""}]}
```
List returns active funds by `sort_order`, without `body_html`. `body_html` is rendered from markdown and sanitized (bleach/nh3) **on the server**.

### `GET /programs/?featured=1` · `GET /programs/{slug}/` · tags `programs`
Detail adds `body_html`, `goals[]`, `beneficiary`, `area`, `duration`, `faq[{q, a}]`, `impact[{year, metric, value}]`,
`images[]`, `fund {slug, title, preset_amounts}` and `related[]` (3 other programs).

### `GET /campaigns/?featured=1` · `GET /campaigns/{slug}/` · tags `campaigns`
```json
{"slug": "orphan-smile", "title": "…", "summary": "…", "body_html": "…", "cover": {…},
 "goal_amount": 500000, "raised_amount": 320000, "percent": 64, "donor_count": 211,
 "monthly_options": [500, 1000, 2000], "highlighted_option": 1000,
 "starts_at": "…", "ends_at": null, "is_ended": false, "fund": {"slug": "orphan", "title": "এতিম সহায়তা"},
 "recent_donors": [{"name": "রহিম", "amount": 1000, "paid_at": "…"}, {"name": null, "amount": 500, "paid_at": "…"}]}
```
`recent_donors`: last 10 PAID, **first name only**; `name: null` when anonymous (the UI shows "নাম প্রকাশে অনিচ্ছুক").
Never phone or email. `raised_amount` is cached for 60 seconds.

### `GET /posts/?category=&page=` · `GET /posts/{slug}/` · `GET /post-categories/` · tags `posts`
List items: `slug, title, excerpt, cover, category {slug, name}, published_at`. Detail adds `body_html`, `related[]` (3).
Drafts (`published_at` null or in the future) return 404.

### `GET /gallery/?category=&kind=photo|video&page=` · tags `gallery`
Items: `id, kind, image {…}, youtube_id, caption, category {slug, name}`. `?limit=6` for the home mosaic.

### `GET /people/` · `GET /reports/` · `GET /jobs/` · tags `people`, `reports`, `jobs`
`/reports/` accepts `?kind=annual|audit|registration|other` and `?year=`. People without `photo_consent` come back with `photo: null`. Jobs: only `is_open` and not past `closes_at`.

### `GET /transparency/totals/` · tag `transparency`
```json
{"years": [{"year": 2026, "funds": [{"slug": "sadaqah", "title": "সাদাকাহ", "total": 0, "is_zakat": false}], "total": 0}]}
```
Sum of PAID donations by year (Asia/Dhaka) and fund; zakat funds listed separately.

---

## Forms

| Endpoint | Body | Returns |
|---|---|---|
| `POST /contact/` | `name, contact, subject, message` | `201 {}` |
| `POST /volunteers/` | `name, phone, email?, district, skills?, availability?` | `201 {}` |
| `POST /subscribers/` | `email` | `201 {}`. Existing emails also get `201` (no enumeration). |
| `POST /subscribers/unsubscribe/` | `token` | `200 {}` |

---

## Donations

### `POST /donations/`
Creates a PENDING donation and starts the gateway session.
```json
{
  "fund": "orphan", "campaign": "orphan-smile", "amount": 1000, "kind": "one_time",
  "donor_name": "…", "donor_phone": "01712345678", "donor_email": "",
  "on_behalf_of": "", "on_behalf_permission": false, "is_anonymous": false,
  "method": "bkash", "locale": "bn",
  "fitra_people": null, "fitra_item": ""
}
```
- `kind: "monthly"` creates the Subscription as well (requires `fund.allow_recurring`); see DONATION_FLOW.md for AUTO vs REMINDER.
- Fitra funds: send `fitra_people` + `fitra_item`; the server computes `amount` from the current rates and ignores the
  client `amount`. Refused with `fitraClosed` after the cutoff.
- The server normalises the phone (`+880…`, Bengali digits) and recomputes everything; it never trusts client totals.
- If the request carries a valid access token, `user` is set.

`201`
```json
{"id": "6f1c…uuid", "redirect_url": "https://sandbox.sslcommerz.com/…", "expires_at": "…"}
```
The Next.js server action redirects the browser to `redirect_url`.

### `GET /donations/{id}/status/`
Public, no auth. The UUID is unguessable; the response holds **no personal data**.
```json
{"id": "…", "status": "paid", "amount": 1000, "fund": {"slug": "orphan", "title": "…"}, "kind": "one_time",
 "receipt_no": "NSF-2026-000123", "paid_at": "…", "fail_reason": null, "receipt_url": "/r/NSD7K2M9QX4PA-k3j9x2m1qa"}
```
`receipt_url` is present only when `status == "paid"`; it is the short signed link `/r/{gateway_ref}-{sig}` (see "Receipts").

### `POST /donations/{id}/refresh/`
Used by the success page while PENDING (at most every 5 seconds, 12 times). If the donation is still PENDING after
2 minutes, Django asks the gateway once (query API) and updates through `mark_paid()`. Returns the same body as `status/`.

---

## Payment gateway callbacks (called by the gateways, not by the frontend)

All of them log a `GatewayEvent`, are **idempotent**, and never trust the parameters until validated server-to-server.

| Endpoint | Caller | Does |
|---|---|---|
| `POST /payments/sslcommerz/ipn/` | SSLCommerz server | Validate `val_id` with the Validation API, check `tran_id == gateway_ref`, `amount` and `currency == BDT`, then `mark_paid()`. Always answers `200` once the event is stored. |
| `POST /payments/sslcommerz/success/` | Donor's browser (form POST from SSLCommerz) | Same validation as the IPN (whichever arrives first wins), then **303** → `/donate/success?id=`. Exempt from CSRF; nothing is trusted without validation. |
| `POST /payments/sslcommerz/fail/` · `cancel/` | Browser | Query by `tran_id`; set FAILED/CANCELLED only if the gateway agrees; 303 → `/donate/failed?id=`. |
| `GET /payments/bkash/callback/?paymentID=&status=` | Browser (redirect from bKash) | `status=success` → Execute Payment once, then Query Payment; `transactionStatus == "Completed"` and amount match → `mark_paid()`. Otherwise FAILED/CANCELLED. 303 to the success or failed page. |
| `GET /payments/bkash/agreement-callback/?paymentID=&status=` | Browser | Execute Agreement → store `agreementID` on the Subscription, then create the first payment. |

Locale for the redirect: Django adds `/en` when `donation.locale == "en"`.

---

## Receipts

### `GET /r/{gateway_ref}-{sig}` (short link, served by Django; Nginx routes `/r/` to Django)
Public receipt link for SMS/email, short enough for one Bengali SMS part (NOTIFICATIONS.md).
`sig` = first 10 characters of base32(HMAC-SHA256(`RECEIPT_TOKEN_SECRET`, `gateway_ref`)), lower-case.
Valid while the donation is PAID or REFUNDED and for **90 days after `paid_at`**. Wrong signature, unknown ref or
expired → 404 (not 403). Returns `application/pdf` rendered by WeasyPrint. Throttled per IP.

`/api/v1/receipts/` is kept as the same handler for links in emails (`/api/v1/receipts/{gateway_ref}-{sig}/`).

### `GET /me/donations/{id}/receipt/`
Same PDF for the logged-in owner. The Next route `/account/receipts/[id]` streams it.

---

## Auth (donors)

| Endpoint | Body | Returns |
|---|---|---|
| `POST /auth/otp/request/` | `target` (phone or email), `locale` | `200 {"resend_after": 60}`. Same answer whether the account exists or not. |
| `POST /auth/otp/verify/` | `target`, `code` | `200 {"access", "refresh", "access_expires_at", "user": {…me}}`. Creates the donor user on first login and links earlier donations with the same phone/email. |
| `POST /auth/token/refresh/` | `refresh` | `200 {"access", "refresh", "access_expires_at"}` (rotation on; the old refresh is blacklisted) |
| `POST /auth/logout/` | `refresh` | `204`; blacklists the refresh token |

Staff don't use these; they log in to `/admin/` with a session (ADMIN.md). The OTP endpoints refuse staff accounts,
so a stolen phone can't open a staff account.

## Donor account (`Authorization: Bearer`)

| Endpoint | Returns / does |
|---|---|
| `GET /me/` · `PATCH /me/` | `{id, name, phone, email, preferred_locale}`; PATCH accepts `name`, `email`, `preferred_locale` (changing email sends an OTP to the new address first) |
| `GET /me/summary/` | `{"year_total": 0, "donation_count": 0, "active_plans": 0}` (current Asia/Dhaka year) |
| `GET /me/donations/?page=` | Own donations: `id, created_at, paid_at, fund, amount, method, status, receipt_no` |
| `GET /me/subscriptions/` | `id, fund, amount, method, mode, status, next_charge_on, fail_count` |
| `PATCH /me/subscriptions/{id}/` | `{amount}`; applies from the next charge |
| `POST /me/subscriptions/{id}/pause/` · `resume/` · `cancel/` | State change; `409 conflict` if not allowed. Cancel also cancels the bKash agreement. |

Another user's id → **404**, never 403 (don't reveal that it exists).

---

## Internal

| Endpoint | Notes |
|---|---|
| `GET /health/` | `200 {"db": "ok", "redis": "ok"}` or `503`. Public, for the uptime monitor; no version numbers. |
| Next.js `POST /internal/revalidate` | Called by Django: header `X-Revalidate-Secret`, body `{"tags": ["programs"]}`. Not part of Django. |
