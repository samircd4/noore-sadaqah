# Donation Flow

The most important feature. Build it carefully and test it in sandbox mode first.
Endpoints: `API.md`. Models and `mark_paid()`: `DATA_MODEL.md`.

## One-time donation

```
Quick-donate (home) / DonateForm (/donate/[fund])        frontend, client component
   │  Zod check → keeps the form in sessionStorage (to pre-fill /donate/failed)
   ▼
/donate/checkout  (review)  →  "পেমেন্ট করুন"
   ▼
Next server action createDonation()                      frontend/src/lib/actions/donate.js
   │  Zod again → POST /api/v1/donations/  (+ Bearer token if logged in, + X-Forwarded-For)
   ▼
Django DonationCreateView                                backend/donations
   1. Serializer validates (fund active, amount ≥ min, BD mobile, fitra rules, recurring allowed)
   2. Donation {status: PENDING, gateway_ref}
   3. Start a gateway session (SSLCommerz initiate / bKash create payment) → GatewayEvent
   4. 201 {id, redirect_url}
   ▼
Server action redirect(redirect_url) → donor pays on SSLCommerz / bKash
   ▼
Gateway → Django                                         backend/payments
   • SSLCommerz: IPN (server-to-server) and the browser's success POST → Validation API with val_id
   • bKash: browser callback → Execute Payment → Query Payment
   ▼
If the gateway confirms status, tran_id/paymentID, amount and BDT:
   mark_paid() → one transaction: PAID, paid_at, receipt_no, gateway_txn_id
   on commit → Celery send_receipt (SMS + email with signed PDF link)
   ▼
Django 303 → /{locale}/donate/success?id=…   (page reads GET /donations/{id}/status/ — never query params)
```

### Rules

1. **Never trust the redirect.** Only `mark_paid()`, after server-to-server validation, sets PAID. The success page shows
   whatever Django says.
2. **Idempotent everywhere.** IPN and browser success can both arrive, in any order, more than once. `mark_paid()` locks
   the row and returns early if already PAID: one receipt number, one SMS.
3. **Check everything the gateway confirms:** status (`VALID`/`VALIDATED`, or bKash `Completed`), our `gateway_ref`,
   amount `== donation.amount`, currency `BDT`. On a mismatch: don't mark PAID, store a `GatewayEvent`, alert the admin.
4. **Late confirmations.** A FAILED donation may become PAID if the gateway later confirms it. A CANCELLED one is not
   changed automatically; it raises an admin alert (`RUNBOOK.md`).
5. **Pending cleanup.** Celery beat task `cleanup_pending` (daily 03:00 Dhaka): for PENDING donations older than
   24 hours, query the gateway once, then mark PAID / FAILED / CANCELLED.
6. **Sandbox first.** `SSLCOMMERZ_SANDBOX=true` / `BKASH_SANDBOX=true` until `QA_CHECKLIST.md` §4–6 pass.
7. **Gateway calls have timeouts** (10 s connect+read) and are logged. A timeout during create returns `502 gatewayUnavailable`; the donation stays PENDING and the cleanup task settles it.

### SSLCommerz details

- Initiate: `total_amount`, `currency=BDT`, `tran_id=gateway_ref`, `success_url`/`fail_url`/`cancel_url`
  (`SITE_URL/api/v1/payments/sslcommerz/{success,fail,cancel}/`), `ipn_url`, `cus_name`, `cus_phone`,
  `product_name` (fund title), `product_category=donation`, `product_profile=non-physical-goods`, `shipping_method=NO`.
- `cus_email` is required by SSLCommerz: when the donor gave none, send a fixed address of ours
  (`donations@nooresadaqah.org`) and never show it to the donor.
- Validation API with `val_id`; for the cleanup/query fallback use the transaction-query API with `tran_id`.
- Also set the IPN URL in the merchant panel.

### bKash Tokenized Checkout details

- Grant token (cached in Redis until shortly before it expires; refresh with the refresh-token call).
- Create Payment (`mode: "0011"`, `intent: "sale"`, `merchantInvoiceNumber = gateway_ref`, `callbackURL`)
  → `bkashURL`, `paymentID` (stored in `gateway_session`).
- Callback `status=success` → **Execute once** → Query Payment. `cancel`/`failure` → CANCELLED/FAILED.
- If Execute times out, never execute again: use Query Payment to find the result.

## Monthly (recurring) giving

Two modes per subscription (`Subscription.mode`):

| Mode | How a month is charged | Needs |
|---|---|---|
| **AUTO** | Celery charges the stored token with no action from the donor | bKash's recurring/subscription payment product, or SSLCommerz card tokenization, **enabled on our merchant account** |
| **REMINDER** | On the due date the donor gets an SMS/email with a one-tap pay link to a pre-filled checkout; the payment is linked to the subscription | Nothing extra; always works |

> **Gateway reality check, confirm during merchant onboarding:**
> - A bKash Tokenized *agreement* (`mode: "0000"` then payments with `mode: "0001"`) saves the wallet, but the donor
>   still confirms each payment with a PIN. A truly unattended monthly charge needs bKash's separate recurring
>   (subscription) payment approval. Ask bKash which product our account gets.
> - SSLCommerz card tokenization / recurring is not on by default; ask SSLCommerz.
> - Until a mode is confirmed for a method, new subscriptions for that method use **REMINDER**. The site toggles this per
>   method with a SiteSetting (`recurring_modes: {"bkash": "reminder", "sslcommerz": "reminder"}`).
> - Wording on the site must match the mode: never promise "automatic" for REMINDER plans.

**Flow**
1. The donor picks "মাসিক" on the donate form. **Login is required** for monthly giving (they need `/account/recurring`
   to manage it); the form sends them through OTP login first and then back with the form kept.
2. `POST /donations/` with `kind: "monthly"` creates the Subscription (`anchor_day` = today's day in Dhaka,
   `next_charge_on` = one month later) and the first Donation linked to it.
3. AUTO: the first payment also creates the agreement or token (`gateway_token`, encrypted).
4. Celery beat task `charge_subscriptions` runs **daily 10:00 Dhaka**:
   - selects `status = ACTIVE AND next_charge_on <= today`, `select_for_update(skip_locked=True)` so two workers never take the same row;
   - **one charge per subscription per due date**: the unique constraint on `Donation(subscription, due_on)` makes a
     second run on the same day a no-op (a retry 3 days later reuses the same Donation row, not a new one);
   - AUTO: create a PENDING Donation, charge it, and on confirmation `mark_paid()`;
   - REMINDER: create a PENDING Donation and send the pay link (valid 7 days), and remind once after 3 days;
   - success: `next_charge_on = add_month(…, anchor_day)`, `fail_count = 0`;
   - failure (AUTO) or unpaid after 7 days (REMINDER): `fail_count += 1`, retry in 3 days; after 3 failures
     `status = FAILED` and SMS the donor (`monthly_failed` template).
5. Pause / resume / cancel / change amount from `/account/recurring`. Cancel also cancels the bKash agreement.
   Resume sets `next_charge_on` to the next anchor date in the future (never charges for paused months).

## Offline donations

Bank transfer, cash and mobile payments made outside the site are entered by staff in the admin
(`ADMIN.md` → "Offline donation"), methods `bank_transfer | cash | bkash_offline | nagad_offline | rocket_offline`.
The admin form creates the Donation and calls `mark_paid(paid_at=date received)` in the same transaction, so
offline gifts get receipt numbers the same way.

## Fitra

- A fund with `is_fitra = True`. The form asks for **number of people** and **item** (rates from SiteSetting `fitra`).
  The server computes `amount = people × rate`. No free amount, no monthly option (ZAKAT_POLICY F1–F5).
- After `fitra.cutoff` the API refuses new fitra donations (`fitraClosed`) and the page shows the cut-off message.
- **Not built until ZAKAT_POLICY.md is signed off.**

## Receipts

- Number format `NSF-{year}-{6-digit sequence}` from `ReceiptCounter` (year in Asia/Dhaka), set inside `mark_paid()`.
- PDF made on demand by WeasyPrint from `templates/receipts/receipt.html` with embedded Noto Bengali fonts; not stored.
- Contents: foundation name, registration number and address, receipt no, date (Bengali), donor name (always the real
  name: "anonymous" only hides it on public pages), on-behalf-of name, fund, amount in digits **and in words** (`amount_in_words_bn`), method, transaction ID,
  "যাকাত হিসেবে গৃহীত" for zakat funds (text approved by the Shariah advisor), "ফেরতকৃত" watermark when refunded.
- Tax wording: only what CONTENT.md §2 confirms. If tax deductibility is unconfirmed, the receipt says nothing about tax.
- Language: `donation.locale`.
- Delivery: SMS (short text + link) and email (PDF attached, if an email was given). Templates: `NOTIFICATIONS.md`.

## Zakat calculator

Client component on `/zakat-calculator` and inside the zakat fund page. **Spec, inputs and rounding are in
`ZAKAT_POLICY.md` §3 and are not final until it is signed off.** Until then `GET /site/` returns
`zakat_enabled: false` and the page shows "শীঘ্রই আসছে".

- The nisab prices come from `GET /site/` (`nisab`), entered by an Admin, shown with their date.
- Nothing the donor types is sent to the server. The "এই পরিমাণ দান করুন" button opens `/donate/zakat?amount=…`.
