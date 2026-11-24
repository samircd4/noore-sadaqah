"""
Site-wide settings (DATA_MODEL.md "core"). One row of plain fields plus small row tables, so staff edit everything
as normal form fields and table rows in the admin, never as JSON (DECISIONS.md D18).
"""

from django.core.exceptions import ValidationError
from django.db import models

from .images import image_upload_validators


class TimeStamped(models.Model):
    """created_at / updated_at on every model (DATA_MODEL.md "Conventions")."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class RecurringMode(models.TextChoices):
    REMINDER = "reminder", "Reminder (pay link each month)"
    AUTO = "auto", "Automatic charge"


class SiteSettings(TimeStamped):
    """The one row of site settings (always pk=1; use SiteSettings.load())."""

    # Contact
    address_bn = models.CharField(max_length=200, blank=True)
    address_en = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    hours_bn = models.CharField(max_length=200, blank=True)
    hours_en = models.CharField(max_length=200, blank=True)
    map_embed_url = models.URLField(max_length=500, blank=True)

    # Social links
    facebook = models.URLField(blank=True)
    youtube = models.URLField(blank=True)
    instagram = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)

    # Quote band
    quote_text_bn = models.CharField(max_length=300, blank=True)
    quote_text_en = models.CharField(max_length=300, blank=True)
    quote_source_bn = models.CharField(max_length=200, blank=True)
    quote_source_en = models.CharField(max_length=200, blank=True)

    # Registration
    reg_authority_bn = models.CharField("registration authority (bn)", max_length=200, blank=True)
    reg_authority_en = models.CharField("registration authority (en)", max_length=200, blank=True)
    reg_number = models.CharField("registration number", max_length=100, blank=True)
    reg_date = models.DateField("registration date", null=True, blank=True)
    reg_certificate = models.FileField("registration certificate", upload_to="registration/", blank=True)

    # About (on /about; the long story is the "about" Page)
    mission_bn = models.TextField(blank=True)
    mission_en = models.TextField(blank=True)
    vision_bn = models.TextField(blank=True)
    vision_en = models.TextField(blank=True)

    promo_youtube_id = models.CharField("promo video YouTube id", max_length=20, blank=True)

    # Zakat and fitra (ZAKAT_POLICY.md: stays off until signed off)
    zakat_enabled = models.BooleanField(default=False, help_text="Turns on the zakat calculator and the fitra form.")
    silver_price_per_gram = models.PositiveIntegerField(default=0)
    gold_price_per_gram = models.PositiveIntegerField(default=0)
    karat = models.CharField(max_length=5, default="22K")
    nisab_source = models.CharField(max_length=200, blank=True)
    nisab_updated_at = models.DateTimeField(null=True, blank=True)
    fitra_year = models.PositiveSmallIntegerField(null=True, blank=True)
    fitra_open = models.BooleanField(default=False, help_text="Fitra donations are accepted (needs zakat enabled).")
    fitra_cutoff = models.DateTimeField(null=True, blank=True)

    # Payment switches (Admin only, audited)
    pay_sslcommerz = models.BooleanField("SSLCommerz on", default=True)
    pay_bkash = models.BooleanField("bKash on", default=True)
    recurring_mode_sslcommerz = models.CharField(max_length=8, choices=RecurringMode.choices, default="reminder")
    recurring_mode_bkash = models.CharField(max_length=8, choices=RecurringMode.choices, default="reminder")

    class Meta:
        verbose_name = verbose_name_plural = "site settings"

    def __str__(self):
        return "Site settings"

    def save(self, *args, **kwargs):
        self.pk = 1  # there is only ever one row
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings

    @property
    def fitra_is_open(self):
        return self.zakat_enabled and self.fitra_open

    def listed_payment_methods(self):
        """Online methods switched on here, in the order the donate page shows them."""
        return [m for m, on in (("bkash", self.pay_bkash), ("sslcommerz", self.pay_sslcommerz)) if on]


class SettingsRow(models.Model):
    """A row in one of the settings tables, kept in the order staff drag them to."""

    settings = models.ForeignKey(SiteSettings, on_delete=models.CASCADE, default=1)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        abstract = True
        ordering = ["sort_order", "pk"]


class Stat(SettingsRow):
    """A number on the home page stats band: 12,500+ families supported."""

    value = models.PositiveIntegerField()
    suffix = models.CharField(max_length=5, blank=True)
    label_bn = models.CharField(max_length=80)
    label_en = models.CharField(max_length=80, blank=True)

    class Meta(SettingsRow.Meta):
        verbose_name = "stat"

    def __str__(self):
        return self.label_bn


class MobileBankingAccount(SettingsRow):
    """A merchant number donors can send money to directly (merchant numbers only, never a personal one)."""

    class Service(models.TextChoices):
        BKASH = "bkash", "bKash"
        NAGAD = "nagad", "Nagad"
        ROCKET = "rocket", "Rocket"

    class Type(models.TextChoices):
        MERCHANT = "merchant", "Merchant"
        AGENT = "agent", "Agent"

    service = models.CharField(max_length=10, choices=Service.choices)
    number = models.CharField(max_length=20)
    type = models.CharField(max_length=10, choices=Type.choices, default=Type.MERCHANT)

    class Meta(SettingsRow.Meta):
        verbose_name = "mobile banking number"

    def __str__(self):
        return f"{self.get_service_display()} {self.number}"


class FitraRate(SettingsRow):
    """This year's fitra amount per person for one food item."""

    item_bn = models.CharField(max_length=60)
    item_en = models.CharField(max_length=60, blank=True)
    amount = models.PositiveIntegerField(help_text="Taka per person")

    class Meta(SettingsRow.Meta):
        verbose_name = "fitra rate"

    def __str__(self):
        return self.item_bn


class ContactFaq(SettingsRow):
    """A question and answer on /contact."""

    q_bn = models.CharField("question (bn)", max_length=300)
    q_en = models.CharField("question (en)", max_length=300, blank=True)
    a_bn = models.TextField("answer (bn)")
    a_en = models.TextField("answer (en)", blank=True)

    class Meta(SettingsRow.Meta):
        verbose_name = "contact FAQ"
        verbose_name_plural = "contact FAQ"

    def __str__(self):
        return self.q_bn


class HomeImage(SettingsRow):
    """One of the fixed photos on the home page and layout (hero, about, quote, volunteer, footer)."""

    class Slot(models.TextChoices):
        HERO = "hero", "Hero"
        ABOUT_MAIN = "about_main", "About (large)"
        ABOUT_SMALL = "about_small", "About (small)"
        QUOTE = "quote", "Quote band"
        VOLUNTEER = "volunteer", "Volunteer band"
        FOOTER = "footer", "Footer"

    slot = models.CharField(max_length=12, choices=Slot.choices, unique=True)
    image = models.ImageField(
        upload_to="home/", width_field="width", height_field="height", validators=image_upload_validators
    )
    width = models.PositiveIntegerField(null=True, editable=False)
    height = models.PositiveIntegerField(null=True, editable=False)
    alt_bn = models.CharField("alt text (bn)", max_length=200)
    alt_en = models.CharField("alt text (en)", max_length=200, blank=True)

    class Meta(SettingsRow.Meta):
        verbose_name = "home image"

    def __str__(self):
        return self.get_slot_display()

    def clean(self):
        if self.image and not self.alt_bn:
            raise ValidationError({"alt_bn": "Bengali alt text is required for an image."})
