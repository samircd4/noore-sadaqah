# Admin Area: Django admin + Unfold

Staff work in **Django admin at `/admin/`**, themed with `django-unfold` (DECISIONS.md D4). There is no admin in Next.js.
The admin is in **Bengali** (`LANGUAGE_CODE = "bn"` for the admin, labels in `locale/bn/LC_MESSAGES/django.po`).

## Groups (roles)

| Group | Who | Summary |
|---|---|---|
| `Admin` | Chairman, treasurer, 1–2 trusted staff | Everything, including money, users and settings |
| `Accountant` | Accounts staff (**proposed**, DECISIONS.md D12) | Donations, offline entries, refunds, subscriptions, exports; no content, users or settings |
| `Editor` | Content / social media staff | Content only; donation totals without donor contact details |
| *(no group, `is_staff=False`)* | Donors | No admin access |

Superuser is only for the developer during setup and emergencies. Day-to-day Admins are `is_staff=True` in the `Admin` group, not superusers.
`manage.py seed` creates the three groups with the permissions below; changing them later goes through a data migration, not clicks.

## Permission matrix

✅ allowed · 👁 read only · ❌ no access

| Area | Admin | Accountant | Editor |
|---|---|---|---|
| Dashboard totals | ✅ | ✅ | 👁 totals only |
| Donations list | ✅ | ✅ | 👁 without phone/email (masked: `017******78`) |
| Donation detail + gateway events | ✅ | ✅ | ❌ |
| Add offline donation | ✅ | ✅ | ❌ |
| Mark refunded | ✅ | ✅ | ❌ |
| Resend receipt | ✅ | ✅ | ❌ |
| CSV export (donations, donors) | ✅ | ✅ | ❌ |
| Subscriptions (view, pause, cancel) | ✅ | ✅ | ❌ |
| Funds: create / deactivate / amounts / zakat flags / bank details | ✅ | ❌ | ❌ |
| Funds: story text and photo | ✅ | ❌ | ✅ |
| Programs, campaigns: text and photos | ✅ | ❌ | ✅ |
| Campaigns: goal, dates, fund | ✅ | ❌ | ❌ |
| News posts, categories, gallery, people, reports, jobs | ✅ | ❌ | ✅ |
| Messages, volunteers | ✅ | ❌ | ✅ |
| Newsletter subscribers export | ✅ | ❌ | ❌ |
| Settings: stats, quote, social, promo video | ✅ | ❌ | ✅ |
| Settings: contact, registration, mobile banking, nisab, fitra, zakat_enabled, recurring_modes, payment_methods | ✅ | ❌ | ❌ |
| Staff users and groups | ✅ | ❌ | ❌ |
| Audit log | 👁 | 👁 own actions | ❌ |

**Enforcement:** standard model permissions (`view/add/change`) per Group, plus field-level rules in each `ModelAdmin`
(`get_readonly_fields`, `get_fields`, `get_queryset`) and custom permissions for actions:
`donations.refund_donation`, `donations.export_donations`, `donations.resend_receipt`, `engagement.export_subscribers`.
Every custom action checks `request.user.has_perm(...)`; hiding a button is not enough. **No group has `delete`
permission on Donation, Subscription, GatewayEvent, OutboundMessage or AuditLog.**

## Staff accounts

- Created only by an Admin (no public sign-up). Email + password (Django's hashers, Argon2 preferred, minimum 12
  characters via `AUTH_PASSWORD_VALIDATORS`).
- The first superuser is created by `manage.py seed` from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
- **Lockout:** 15 minutes after 5 failed logins (use `django-axes`, or `failed_logins`/`locked_until` on User).
- **Second factor:** TOTP for Admin and Accountant (`django-otp` + Unfold's login), **required before launch** because
  these accounts can see donor data and mark refunds.
- Disabling a staff member: set `is_active=False` (or `is_staff=False` and remove groups). Their audit history stays.
- Session cookie for `/admin/`: `Secure`, `HttpOnly`, expires after 8 hours or on browser close.

## Audit log

Write an `AuditLog` row (`audit/helpers.py::audit(request, action, obj, before, after)`) for every change to:
donations (offline create, refund, resend), subscriptions (pause/cancel by staff), funds, campaigns (goal/dates/fund),
SiteSetting, users/groups, and **every CSV export**. Store only the changed fields (`{before, after}`).
Django's own `LogEntry` stays on as well. The audit admin is read-only.

## Admin screens (`ModelAdmin` specs)

### Dashboard (Unfold `DASHBOARD_CALLBACK` → `core/dashboard.py`, template `templates/admin/index.html`)
"ড্যাশবোর্ড" is the first sidebar link. Money counts only PAID donations, by Asia/Dhaka day; numbers refresh every minute.
1. **Money cards:** today, this month (with ▲/▼ vs the same point last month), this year, and **zakat this year on its
   own** (never added into the general totals).
2. **Last 30 days:** bar chart of daily PAID taka, general funds and zakat as separate bars.
3. **By fund this year:** count, taka and share per fund; zakat funds last.
4. **Needs attention** (hidden when 0, each links to the filtered list): PENDING older than 1 hour, unhandled
   messages, new volunteers, draft posts, content missing English, sample facts still in the settings.
   Subscriptions FAILED or `fail_count > 0` join here with B4.
5. **Latest 10 donations** with donor name (Admin, Accountant).
6. **Active campaigns:** progress bars with raised / goal (same numbers as the website).

Each section is shown only to staff with the matching view permission (`core/groups.py`): Editors see the totals,
chart, campaigns and content to-dos, never donor names or pending donations.

### Donations
- `list_display`: receipt_no, paid_at, donor_name, masked phone (for Editor), fund, amount (`৳` formatted), method, status badge, campaign
- `list_filter`: status, fund, method, kind, campaign, date range on `paid_at` (Unfold range filter)
- `search_fields`: receipt_no, donor_name, donor_phone, donor_email, gateway_ref, gateway_txn_id
- Detail: all fields read-only for online donations; inline read-only `GatewayEvent` list (collapsed); `OutboundMessage` list.
- Actions (detail-page buttons, with confirmation):
  - **"গেটওয়েতে যাচাই করুন"**: query the gateway once for a PENDING donation; same code path as the cleanup task.
  - **"রসিদ আবার পাঠান"**: re-queue `send_receipt`.
  - **"ফেরত দেওয়া হয়েছে"**: form with `refund_ref` (required) and `refund_reason`.
- `fund` is never editable after creation (zakat lock, DATA_MODEL.md).

### Offline donation (custom admin view "অফলাইন দান যোগ করুন")
1. Fields: fund, amount, date received, donor name, phone, email (optional), on behalf of, method (`bank_transfer`,
   `cash`, `bkash_offline`, `nagad_offline`, `rocket_offline`), reference (bank slip / transaction no.), note,
   "এসএমএস রসিদ পাঠান" checkbox (on by default).
2. Saving creates the Donation with `created_by = request.user` and calls `mark_paid(paid_at=date received)` in the
   same transaction; AuditLog row.
3. Duplicate check: if the same phone + amount + date exists, show a warning and ask to confirm.

### Refund (Admin, Accountant)
1. Refund in the gateway's merchant panel first (SSLCommerz / bKash). The site doesn't call refund APIs in v1.
2. In the donation detail → "ফেরত দেওয়া হয়েছে" → refund reference + reason.
3. Status becomes REFUNDED; totals and campaign progress drop automatically (they count only PAID).
4. The receipt PDF now shows "ফেরতকৃত". The receipt number is kept, never reused.

### Subscriptions
List: donor, fund, amount, method, mode, status, next_charge_on, fail_count. Filters: status, mode, method, fund.
Inline: charge history (Donations). Actions: pause, resume, cancel (with reason). Staff can't change the amount (only the donor can).

### Funds, Programs, Campaigns, Posts, Gallery, People, Reports, Jobs
- Bengali and English fields side by side in Unfold tabs ("বাংলা" / "English").
- Image fields with a preview; alt text required (Bengali). Uploads: JPG/PNG/WebP, max 5 MB, resized to max 2000 px
  wide on upload (Pillow), stored on R2.
- `sort_order` editable in the list (`list_editable`); `is_active` / `is_featured` toggles.
- Fund: bank accounts as table rows (Admin only).
- Program: tables for gallery images, goals, FAQ and impact numbers (drag to sort), never raw JSON.
- Page (`privacy`, `terms`, `refund-policy`, `about`, `how-we-spend`): edit title and markdown body only; no add or delete (the set is fixed by `seed`). Policy pages are Admin-only (legal text); `about` and `how-we-spend` also Editor.
- Post: "প্রকাশ করুন" action sets `published_at = now`. Changing the slug of a published post shows a warning that old links break.
- Campaign: only one `is_featured` at a time (validated).
- Body fields use a markdown editor with preview. Output is sanitized on render.
- Saving any content model triggers the Next.js revalidate hook for its tags (ARCHITECTURE.md).

### Messages, Volunteers, Subscribers
List + "handled" toggle + filters. CSV export (Subscribers: Admin only).

### Settings (SiteSettings)
One page, "সাইট সেটিংস" (the list link opens it directly; no add or delete). Plain form fields in tabs, plus
drag-to-sort tables, never raw JSON (DECISIONS.md D18):
- **Tabs:** যোগাযোগ (contact), সামাজিক (social links), উক্তি ও পরিচিতি (quote, mission, vision, promo video),
  নিবন্ধন (registration + certificate), যাকাত ও ফিতরা (zakat switch, nisab prices, fitra year/open/cutoff),
  পেমেন্ট (SSLCommerz / bKash switches and recurring modes).
- **Tables:** Home stats, Home images (one row per slot), Contact FAQ, Mobile banking numbers (merchant numbers only),
  Fitra rates.
- **Nisab:** see ZAKAT_POLICY.md. A weekly Celery task emails `ADMIN_ALERT_EMAIL` if `nisab_updated_at` is older
  than 30 days.
- Editors change stats, quote, about, social, promo video, home images and contact FAQ; contact, registration,
  zakat/fitra, payment switches, mobile banking and fitra rates are read only for them. Every save is audited.

### Offline totals
Money a fund received in a year outside the website (before launch, cash, bank): year, fund, total, note. Added to
the totals on /transparency. Admin only, audited.

### Users & groups (Admin only)
Create staff, assign one group, reset password, require 2FA. Donor accounts are visible (for support), read-only except `is_active`.

## CSV export columns (donations)

`receipt_no, paid_at, fund, campaign, amount, method, kind, gateway_ref, gateway_txn_id, donor_name, donor_phone,
donor_email, on_behalf_of, is_anonymous, status, subscription_id, reference, created_by`

- Uses `django-import-export` (export only; import is turned off for donations).
- Dates in `Asia/Dhaka`, amounts as plain numbers with English digits so Excel can add them up.
- UTF-8 **with BOM** so Excel shows Bengali correctly.
- Every export is written to the audit log with the filter used and the row count.

## Unfold theme

Colors from `frontend/src/app/tokens.css` in `UNFOLD["COLORS"]` (emerald as primary). Site title "নূরে সাদাকাহ ফাউন্ডেশন",
logo from `frontend/public/`. Sidebar groups: দান (donations, subscriptions, offline), কনটেন্ট, যোগাযোগ, সেটিংস, স্টাফ.
