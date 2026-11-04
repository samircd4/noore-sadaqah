# Data Model (Django)

PostgreSQL through the Django ORM. One section per Django app (`backend/apps/<app>/models.py`).

**Conventions**
- Money is **integer taka**: `models.PositiveIntegerField`. Never `FloatField` or `DecimalField`.
- Bilingual text uses `*_bn` (required) / `*_en` (optional; the API falls back to `*_bn`, see I18N.md).
- Every image field has `*_alt_bn` (required) and `*_alt_en` (CLAUDE.md: images need Bengali alt text).
- Every model inherits `TimeStamped` (`created_at`, `updated_at`).
- Dates are stored in UTC (`USE_TZ = True`, `TIME_ZONE = "Asia/Dhaka"` for display and "which year" logic).
- Choices use `models.TextChoices` so the values are readable in the DB and in CSV exports.
- Donations, subscriptions, gateway events and audit rows are **never hard-deleted** (no delete permission in admin).
- Shorthand in this doc: `title_bn, title_en = …CharField(120)` means two fields of that type (the `_en` one with
  `blank=True`); `cover_image + cover_alt_bn/en` means the image field plus its two alt-text fields. Write them out in full in code.

```python
# apps/core/models.py
class TimeStamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True
```

---

## accounts

```python
class User(AbstractUser, TimeStamped):
    """Donors and staff. Donors log in with an OTP to phone or email; staff use email + password in /admin/."""
    username = None
    email = models.EmailField(unique=True, null=True, blank=True)       # stored lower-case
    phone = models.CharField(max_length=11, unique=True, null=True, blank=True)  # normalised 01XXXXXXXXX
    name = models.CharField(max_length=120, blank=True)
    preferred_locale = models.CharField(max_length=2, default="bn")      # bn | en, for SMS/email language
    failed_logins = models.PositiveSmallIntegerField(default=0)          # staff lockout (ADMIN.md)
    locked_until = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()          # custom manager: create_user(email=None, phone=None, …)

    class Meta:
        constraints = [models.CheckConstraint(
            condition=Q(email__isnull=False) | Q(phone__isnull=False), name="user_has_email_or_phone")]
```
- Staff = `is_staff=True` + membership in a Group (`ADMIN.md`). Donors: `is_staff=False`, no usable password.
- Set `AUTH_USER_MODEL = "accounts.User"` **before the first migration**.

```python
class OtpCode(TimeStamped):
    target = models.CharField(max_length=254, db_index=True)   # 01XXXXXXXXX or lower-case email
    code_hash = models.CharField(max_length=128)                # make_password(code); never the plain code
    expires_at = models.DateTimeField()                         # now + 5 min
    attempts = models.PositiveSmallIntegerField(default=0)      # max 5
    consumed_at = models.DateTimeField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True)
    class Meta:
        indexes = [models.Index(fields=["target", "-created_at"])]
```

## core

```python
class SiteSetting(TimeStamped):
    key = models.CharField(max_length=40, primary_key=True)
    value = models.JSONField()
```

| key | value shape | Edited by |
|---|---|---|
| `stats` | `[{value, suffix, label_bn, label_en}]` | Admin, Editor |
| `contact` | `{address_bn, address_en, phone, whatsapp, email, hours_bn, hours_en, map_embed_url}` | Admin |
| `social` | `{facebook, youtube, instagram, linkedin}` | Admin, Editor |
| `quote` | `{text_bn, text_en, source_bn, source_en}` | Admin, Editor |
| `registration` | `{authority_bn, authority_en, number, date, certificate_url}` | Admin |
| `mobile_banking` | `[{service, number, type}]` (merchant numbers only) | Admin |
| `nisab` | `{silver_price_per_gram, gold_price_per_gram, karat, source, updated_at}` | Admin |
| `fitra` | `{year, rates: [{item_bn, item_en, amount}], cutoff}` | Admin |
| `promo_video` | `{youtube_id}` | Admin, Editor |
| `zakat_enabled` | `true` / `false`: turns on the zakat calculator and fitra form after ZAKAT_POLICY sign-off | Admin |
| `recurring_modes` | `{"bkash": "reminder", "sslcommerz": "reminder"}`: AUTO only once the gateway enables it (DONATION_FLOW.md) | Admin |
| `payment_methods` | `["bkash", "sslcommerz"]`: online methods currently live | Admin |
| `home_images` | `{hero, about_main, about_small, quote, volunteer, footer}`, each an image with `alt_bn`/`alt_en` | Admin, Editor |
| `about` | `{mission_bn, mission_en, vision_bn, vision_en}` (shown on `/about`) | Admin, Editor |
| `contact_faq` | `[{q_bn, q_en, a_bn, a_en}]` (FAQ on `/contact`) | Admin, Editor |

Each key has a JSON schema validated in the admin form (`apps/core/schemas.py`), so a typo can't break the site.

## content

```python
class Fund(TimeStamped):
    slug = models.SlugField(unique=True)                   # sadaqah, zakat, fitra, orphan
    title_bn = models.CharField(max_length=120); title_en = models.CharField(max_length=120, blank=True)
    summary_bn = models.TextField(); summary_en = models.TextField(blank=True)
    body_bn = models.TextField(); body_en = models.TextField(blank=True)        # markdown
    cover_image = models.ImageField(upload_to="funds/", blank=True)
    cover_alt_bn = models.CharField(max_length=200, blank=True); cover_alt_en = models.CharField(max_length=200, blank=True)
    preset_amounts = ArrayField(models.PositiveIntegerField(), default=default_presets)  # [100, 200, 500, 1000]
    min_amount = models.PositiveIntegerField(default=10)
    is_zakat_eligible = models.BooleanField(default=False)
    is_fitra = models.BooleanField(default=False)          # form uses people × rate (ZAKAT_POLICY F2)
    allow_recurring = models.BooleanField(default=True)
    bank_details = models.JSONField(default=list, blank=True)  # [{bank, account_name, branch, number, routing, swift}]
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

class Program(TimeStamped):
    slug = models.SlugField(unique=True)                   # food, education, water, health, trees, mosque
    badge_bn, badge_en = …CharField(40)                    # খাদ্য
    title_bn, title_en = …CharField(120)
    summary_bn, summary_en, body_bn, body_en = …TextField
    cover_image = models.ImageField(upload_to="programs/")
    cover_alt_bn, cover_alt_en = …CharField(200)
    goals_bn = ArrayField(models.CharField(max_length=200), default=list)
    goals_en = ArrayField(models.CharField(max_length=200), default=list, blank=True)
    beneficiary_bn, area_bn, duration_bn (+ _en) = …CharField(200, blank=True)
    faq = models.JSONField(default=list, blank=True)       # [{q_bn, a_bn, q_en, a_en}]
    impact = models.JSONField(default=list, blank=True)    # [{year, metric_bn, metric_en, value}]
    fund = models.ForeignKey(Fund, null=True, blank=True, on_delete=models.SET_NULL)
    is_featured = models.BooleanField(default=False)       # home page
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

class ProgramImage(TimeStamped):                          # gallery strip on /programs/[slug]
    program = models.ForeignKey(Program, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="programs/gallery/")
    alt_bn, alt_en = …CharField(200)
    sort_order = models.PositiveIntegerField(default=0)

class Campaign(TimeStamped):
    slug = models.SlugField(unique=True)
    title_bn, title_en = …CharField(160)
    summary_bn, summary_en = …TextField
    body_bn, body_en = …TextField(blank=True)             # story body on /campaigns/[slug]
    cover_image + cover_alt_bn/en
    goal_amount = models.PositiveIntegerField()
    monthly_options = ArrayField(models.PositiveIntegerField(), default=default_monthly)  # [500, 1000, 2000]
    highlighted_option = models.PositiveIntegerField(null=True, blank=True)               # 1000
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)
    fund = models.ForeignKey(Fund, on_delete=models.PROTECT)
    is_featured = models.BooleanField(default=False)       # home banner; at most one (validated in clean())
    is_active = models.BooleanField(default=True)

class Post(TimeStamped):
    slug = models.SlugField(unique=True)
    title_bn, title_en, excerpt_bn, excerpt_en, body_bn, body_en      # body is markdown, sanitized on render
    cover_image + cover_alt_bn/en
    category = models.ForeignKey("PostCategory", on_delete=models.PROTECT)
    published_at = models.DateTimeField(null=True, blank=True)        # null = draft

class PostCategory(TimeStamped):
    slug = models.SlugField(unique=True)                   # relief, education, health
    name_bn, name_en = …CharField(60)                      # ত্রাণ / Relief
    sort_order = models.PositiveIntegerField(default=0)

class GalleryItem(TimeStamped):
    class Kind(models.TextChoices): PHOTO = "photo"; VIDEO = "video"
    kind = models.CharField(max_length=5, choices=Kind.choices, default=Kind.PHOTO)
    image = models.ImageField(upload_to="gallery/", blank=True)       # photo, or video thumbnail
    youtube_id = models.CharField(max_length=20, blank=True)          # for videos
    alt_bn, alt_en, caption_bn, caption_en = …CharField(200, blank=True)  # alt_bn required for photos (clean())
    category = models.ForeignKey(PostCategory, on_delete=models.PROTECT)  # same categories as news
    taken_at = models.DateField(null=True, blank=True)
    is_published = models.BooleanField(default=True)

class Page(TimeStamped):                                  # long editable text: privacy, terms, refund-policy, about, how-we-spend
    slug = models.SlugField(unique=True)                   # fixed set, created by `seed`; no add/delete in the admin
    title_bn, title_en = …CharField(120)
    body_bn, body_en = …TextField                          # markdown → sanitized body_html in the API
    # updated_at (from TimeStamped) is the "সর্বশেষ হালনাগাদ" date on the policy pages

class Person(TimeStamped):                                # board & advisors on /about
    name_bn, name_en = …CharField(120)
    role_bn, role_en = …CharField(120)                    # চেয়ারম্যান / Chairman
    bio_bn, bio_en = …TextField(blank=True)
    photo + photo_alt_bn/en (blank=True)
    photo_consent = models.BooleanField(default=False)    # photo is shown only if True (CONTENT.md §6)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

class Report(TimeStamped):                                # /transparency
    class Kind(models.TextChoices): ANNUAL = "annual"; AUDIT = "audit"; REGISTRATION = "registration"; OTHER = "other"
    kind = models.CharField(max_length=12, choices=Kind.choices)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    title_bn, title_en = …CharField(200)
    file = models.FileField(upload_to="reports/")         # public PDF
    published_at = models.DateField()

class Job(TimeStamped):                                   # careers tab on /get-involved
    title_bn, title_en, body_bn, body_en, location_bn, location_en
    apply_email = models.EmailField(blank=True); apply_url = models.URLField(blank=True)
    closes_at = models.DateField(null=True, blank=True)
    is_open = models.BooleanField(default=True)
```

## donations

```python
class Method(models.TextChoices):
    SSLCOMMERZ = "sslcommerz"          # online: cards, Nagad, Rocket, net banking via SSLCommerz
    BKASH = "bkash"                    # online: bKash Tokenized Checkout
    BANK_TRANSFER = "bank_transfer"    # offline, entered by staff
    CASH = "cash"                      # offline
    BKASH_OFFLINE = "bkash_offline"    # offline: sent to the merchant number outside the site
    NAGAD_OFFLINE = "nagad_offline"
    ROCKET_OFFLINE = "rocket_offline"

ONLINE_METHODS = {Method.SSLCOMMERZ, Method.BKASH}

class Status(models.TextChoices):
    PENDING = "pending"; PAID = "paid"; FAILED = "failed"; CANCELLED = "cancelled"; REFUNDED = "refunded"

class Kind(models.TextChoices):
    ONE_TIME = "one_time"
    MONTHLY = "monthly"               # a charge that belongs to a Subscription (first or renewal)

class Donation(TimeStamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)   # public id in URLs
    gateway_ref = models.CharField(max_length=30, unique=True, default=new_gateway_ref)
        # our transaction id sent to the gateway, e.g. "NSD7K2M9QX4PA" (SSLCommerz tran_id max 30 chars)
    receipt_no = models.CharField(max_length=20, unique=True, null=True, blank=True)  # NSF-2026-000123, set when PAID
    amount = models.PositiveIntegerField()
    fund = models.ForeignKey(Fund, on_delete=models.PROTECT)
    campaign = models.ForeignKey(Campaign, null=True, blank=True, on_delete=models.PROTECT)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)  # linked by phone/email on login
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.ONE_TIME)
    subscription = models.ForeignKey("subscriptions.Subscription", null=True, blank=True, on_delete=models.PROTECT)
    due_on = models.DateField(null=True, blank=True)        # monthly charges: the anchor date this charge is for

    donor_name = models.CharField(max_length=120)
    donor_phone = models.CharField(max_length=11)                   # 01XXXXXXXXX
    donor_email = models.EmailField(blank=True)
    on_behalf_of = models.CharField(max_length=120, blank=True)
    on_behalf_permission = models.BooleanField(default=False)       # "আমি তার অনুমতি নিয়েছি" (ZAKAT_POLICY Z16)
    is_anonymous = models.BooleanField(default=False)
    locale = models.CharField(max_length=2, default="bn")           # language of SMS/email/receipt

    # fitra (ZAKAT_POLICY F1–F2): amount = fitra_people × fitra_rate
    fitra_people = models.PositiveSmallIntegerField(null=True, blank=True)
    fitra_item = models.CharField(max_length=60, blank=True)
    fitra_rate = models.PositiveIntegerField(null=True, blank=True)
    is_advance_zakat = models.BooleanField(default=False)           # ZAKAT_POLICY Z17, after sign-off

    method = models.CharField(max_length=16, choices=Method.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    gateway_session = models.CharField(max_length=120, blank=True)  # SSLCommerz sessionkey / bKash paymentID
    gateway_txn_id = models.CharField(max_length=80, unique=True, null=True, blank=True)  # bank_tran_id / trxID
    gateway_payload = models.JSONField(null=True, blank=True)       # last validation response (no secrets)
    fail_reason = models.CharField(max_length=200, blank=True)

    # offline entries (ADMIN.md)
    reference = models.CharField(max_length=120, blank=True)        # bank slip / transaction no.
    note = models.TextField(blank=True)
    created_by = models.ForeignKey(User, null=True, blank=True, related_name="+", on_delete=models.PROTECT)

    # refunds (ADMIN.md)
    refund_ref = models.CharField(max_length=120, blank=True)
    refund_reason = models.TextField(blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    refunded_by = models.ForeignKey(User, null=True, blank=True, related_name="+", on_delete=models.PROTECT)

    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status", "created_at"]), models.Index(fields=["fund", "status"]),
                   models.Index(fields=["donor_phone"]), models.Index(fields=["campaign", "status"])]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gte=1), name="donation_amount_positive"),
            models.UniqueConstraint(fields=["subscription", "due_on"], name="one_charge_per_due_date",
                                    condition=Q(subscription__isnull=False)),
            models.CheckConstraint(condition=~Q(status="paid") | Q(receipt_no__isnull=False) & Q(paid_at__isnull=False),
                                   name="paid_has_receipt"),
        ]

class ReceiptCounter(models.Model):
    year = models.PositiveSmallIntegerField(primary_key=True)
    last = models.PositiveIntegerField(default=0)
```

### Marking a donation PAID (the only way)

`apps/donations/services.py::mark_paid(donation_id, *, txn_id, payload, paid_at=None)` is the **only** function that
sets `status = PAID`. It is called by gateway callbacks, the bKash/SSLCommerz query fallback, recurring charges and
offline entry.

```python
from django.db import connection, transaction

def next_receipt_no(year):
    # Atomic upsert: creates the year's row the first time, locks it until the transaction ends.
    with connection.cursor() as c:
        c.execute("""
            INSERT INTO donations_receiptcounter (year, last) VALUES (%s, 1)
            ON CONFLICT (year) DO UPDATE SET last = donations_receiptcounter.last + 1
            RETURNING last""", [year])
        (last,) = c.fetchone()
    return f"NSF-{year}-{last:06d}"

@transaction.atomic
def mark_paid(donation_id, *, txn_id, payload, paid_at=None):
    d = Donation.objects.select_for_update().get(pk=donation_id)
    if d.status == Status.PAID:
        return d, False                       # idempotent: already done, send nothing
    if d.status not in (Status.PENDING, Status.FAILED):
        raise InvalidTransition(d.status)     # never resurrect CANCELLED/REFUNDED automatically
    paid_at = paid_at or timezone.now()
    d.status, d.paid_at, d.gateway_txn_id, d.gateway_payload = Status.PAID, paid_at, txn_id, payload
    d.receipt_no = next_receipt_no(timezone.localtime(paid_at).year)   # year in Asia/Dhaka
    d.save()
    transaction.on_commit(lambda: send_receipt.delay(str(d.pk)))       # Celery, after commit only
    return d, True
```

- The counter row stays locked until commit, so receipt numbers are unique and **gap-free** even when payments arrive at
  the same time. If the transaction rolls back, the increment rolls back too.
- A FAILED → PAID change is allowed, because a gateway may confirm late. CANCELLED → PAID is logged as an alert for a
  person to check (`RUNBOOK.md`).

### Other rules
- **Campaign raised** = `Sum("amount")` of PAID donations with that campaign. Cache it for 60 seconds; never store a running total.
- **Zakat lock:** `Donation.save()` and the admin form refuse to change `fund` once the donation exists. Changing between
  a zakat-eligible and a non-zakat fund raises `ValidationError` even for superusers (ZAKAT_POLICY §4).
- **Linking donors:** when a donor logs in, donations with the same `donor_phone`/`donor_email` and no `user` get linked.

## subscriptions

```python
class Subscription(TimeStamped):
    class Status(models.TextChoices):
        ACTIVE = "active"; PAUSED = "paused"; CANCELLED = "cancelled"; FAILED = "failed"
    class Mode(models.TextChoices):
        AUTO = "auto"            # charged with a stored token (bKash agreement / card token)
        REMINDER = "reminder"    # fallback: donor gets an SMS/email pay link each month (DONATION_FLOW.md)

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    fund = models.ForeignKey(Fund, on_delete=models.PROTECT)
    campaign = models.ForeignKey(Campaign, null=True, blank=True, on_delete=models.SET_NULL)
    amount = models.PositiveIntegerField()
    method = models.CharField(max_length=16, choices=[(Method.SSLCOMMERZ, …), (Method.BKASH, …)])
    mode = models.CharField(max_length=8, choices=Mode.choices)
    gateway_token = EncryptedCharField(max_length=200, blank=True)   # bKash agreementID / card token, encrypted at rest
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    anchor_day = models.PositiveSmallIntegerField()                  # 1–31, day of the first payment
    next_charge_on = models.DateField()                              # Asia/Dhaka date
    fail_count = models.PositiveSmallIntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    paused_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.CharField(max_length=200, blank=True)
```
- **Next date:** `next_charge_on = add_month(previous, anchor_day)`: same `anchor_day` next month, or the last day of
  that month if it is shorter (Jan 31 → Feb 28/29 → Mar 31). A failed charge retries 3 days later without moving the anchor.
- `EncryptedCharField`: a small field that encrypts with Fernet using a key from the env (`FIELD_ENCRYPTION_KEY`).

## payments

```python
class GatewayEvent(models.Model):          # every callback and API call result, for disputes (RUNBOOK.md)
    provider = models.CharField(max_length=12)            # sslcommerz | bkash
    kind = models.CharField(max_length=30)                # ipn, success_redirect, validate, create, execute, query, agreement…
    donation = models.ForeignKey(Donation, null=True, on_delete=models.PROTECT)
    gateway_ref = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=40, blank=True)
    payload = models.JSONField()                          # secrets and card data removed before saving
    ip = models.GenericIPAddressField(null=True)
    received_at = models.DateTimeField(auto_now_add=True)
```

## engagement

```python
class ContactMessage(TimeStamped):
    name, contact (phone or email), subject, message
    handled = models.BooleanField(default=False); handled_by = FK(User, null=True)

class Volunteer(TimeStamped):
    name, phone, email (blank), district (choice from the 64 districts), skills (blank), availability (blank)
    handled = models.BooleanField(default=False)

class Subscriber(TimeStamped):
    email = models.EmailField(unique=True)
    locale = models.CharField(max_length=2, default="bn")
    unsubscribe_token = models.CharField(max_length=43, unique=True, default=secrets.token_urlsafe)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
```

## notifications

```python
class OutboundMessage(TimeStamped):
    channel = models.CharField(max_length=5)              # sms | email
    template = models.CharField(max_length=40)            # receipt, otp, monthly_failed … (NOTIFICATIONS.md)
    to = models.CharField(max_length=254)                 # stored in DB (needed for support), never logged
    donation = models.ForeignKey(Donation, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=10, default="queued")   # queued | sent | failed
    provider_ref = models.CharField(max_length=120, blank=True)
    error = models.CharField(max_length=300, blank=True)
    segments = models.PositiveSmallIntegerField(null=True)       # SMS cost tracking
```
OTP messages store `template="otp"` but **not** the code.

## audit

```python
class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    action = models.CharField(max_length=60)              # donation.refund, fund.update, export.donations
    target = models.CharField(max_length=80)              # "donations.Donation:<uuid>"
    data = models.JSONField(null=True)                    # {"before": {...}, "after": {...}} changed fields only
    ip = models.GenericIPAddressField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```
Read-only in the admin: no add, change or delete permission for anyone.

## Seed data

`python manage.py seed` (idempotent) creates the four funds, six programs, the featured campaign, sample posts and
categories, and the `SiteSetting` rows by **loading the frontend mock fixtures** (`frontend/src/mocks/fixtures/*.json`,
whose content comes from `HOME_PAGE.md` / `CONTENT.md`; `{bn, en}` values map to `*_bn` / `*_en` fields), the staff Groups with their permissions
(`ADMIN.md`), and the first superuser from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
Placeholder (🟡) content is marked so the launch check can find it: `SiteSetting("content_status")` lists unconfirmed items.
