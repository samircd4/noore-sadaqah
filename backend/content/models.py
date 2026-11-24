"""
Content models (DATA_MODEL.md "content"). Lists inside a model (bank accounts, program goals, FAQ, impact numbers)
are small row tables, so staff edit them as table rows in the admin, never as JSON (DECISIONS.md D18).
"""

from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.images import image_upload_validators
from core.models import TimeStamped


def default_presets():
    return [100, 200, 500, 1000]


def default_monthly():
    return [500, 1000, 2000]


def image_field(upload_to, prefix, blank=True):
    """An ImageField that records its own width and height (in `<prefix>_width` / `<prefix>_height`)."""
    return models.ImageField(
        upload_to=upload_to,
        blank=blank,
        width_field=f"{prefix}_width",
        height_field=f"{prefix}_height",
        validators=image_upload_validators,
    )


def size_field():
    return models.PositiveIntegerField(null=True, blank=True, editable=False)


class Fund(TimeStamped):
    slug = models.SlugField(unique=True)  # sadaqah, zakat, fitra, orphan
    title_bn = models.CharField(max_length=120)
    title_en = models.CharField(max_length=120, blank=True)
    summary_bn = models.TextField()
    summary_en = models.TextField(blank=True)
    body_bn = models.TextField()  # markdown
    body_en = models.TextField(blank=True)
    cover_image = image_field("funds/", "cover")
    cover_width = size_field()
    cover_height = size_field()
    cover_alt_bn = models.CharField(max_length=200, blank=True)
    cover_alt_en = models.CharField(max_length=200, blank=True)
    preset_amounts = ArrayField(models.PositiveIntegerField(), default=default_presets)
    min_amount = models.PositiveIntegerField(default=10)
    is_zakat_eligible = models.BooleanField(default=False)
    is_fitra = models.BooleanField(default=False)
    allow_recurring = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "slug"]

    def __str__(self):
        return self.title_bn


class FundBankAccount(models.Model):
    """A bank account donors can transfer to for this fund (shown on /donate/<fund>)."""

    fund = models.ForeignKey(Fund, on_delete=models.CASCADE, related_name="bank_accounts")
    bank = models.CharField(max_length=120)
    account_name = models.CharField(max_length=120)
    branch = models.CharField(max_length=120, blank=True)
    number = models.CharField(max_length=40)
    routing = models.CharField(max_length=20, blank=True)
    swift = models.CharField(max_length=20, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "pk"]
        verbose_name = "bank account"

    def __str__(self):
        return f"{self.bank} {self.number}"


class Program(TimeStamped):
    slug = models.SlugField(unique=True)  # food, education, water, health, trees, mosque
    badge_bn = models.CharField(max_length=40)
    badge_en = models.CharField(max_length=40, blank=True)
    title_bn = models.CharField(max_length=120)
    title_en = models.CharField(max_length=120, blank=True)
    summary_bn = models.TextField()
    summary_en = models.TextField(blank=True)
    body_bn = models.TextField()
    body_en = models.TextField(blank=True)
    cover_image = image_field("programs/", "cover", blank=False)
    cover_width = size_field()
    cover_height = size_field()
    cover_alt_bn = models.CharField(max_length=200)
    cover_alt_en = models.CharField(max_length=200, blank=True)
    beneficiary_bn = models.CharField(max_length=200, blank=True)
    beneficiary_en = models.CharField(max_length=200, blank=True)
    area_bn = models.CharField(max_length=200, blank=True)
    area_en = models.CharField(max_length=200, blank=True)
    duration_bn = models.CharField(max_length=200, blank=True)
    duration_en = models.CharField(max_length=200, blank=True)
    fund = models.ForeignKey(Fund, null=True, blank=True, on_delete=models.SET_NULL, related_name="programs")
    is_featured = models.BooleanField(default=False)  # home page
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "slug"]

    def __str__(self):
        return self.title_bn


class ProgramRow(models.Model):
    program = models.ForeignKey(Program, on_delete=models.CASCADE)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        abstract = True
        ordering = ["sort_order", "pk"]


class ProgramImage(ProgramRow):
    """Gallery strip on /programs/<slug>."""

    image = image_field("programs/gallery/", "image", blank=False)
    image_width = size_field()
    image_height = size_field()
    alt_bn = models.CharField(max_length=200)
    alt_en = models.CharField(max_length=200, blank=True)

    class Meta(ProgramRow.Meta):
        default_related_name = "images"
        verbose_name = "image"

    def __str__(self):
        return self.alt_bn


class ProgramGoal(ProgramRow):
    text_bn = models.CharField(max_length=200)
    text_en = models.CharField(max_length=200, blank=True)

    class Meta(ProgramRow.Meta):
        default_related_name = "goals"
        verbose_name = "goal"

    def __str__(self):
        return self.text_bn


class ProgramFaq(ProgramRow):
    q_bn = models.CharField("question (bn)", max_length=300)
    q_en = models.CharField("question (en)", max_length=300, blank=True)
    a_bn = models.TextField("answer (bn)")
    a_en = models.TextField("answer (en)", blank=True)

    class Meta(ProgramRow.Meta):
        default_related_name = "faqs"
        verbose_name = "FAQ"
        verbose_name_plural = "FAQ"

    def __str__(self):
        return self.q_bn


class ProgramImpact(ProgramRow):
    """A result for one year: 2025 · families fed · 4,000."""

    year = models.PositiveSmallIntegerField()
    metric_bn = models.CharField(max_length=120)
    metric_en = models.CharField(max_length=120, blank=True)
    value = models.PositiveIntegerField()

    class Meta(ProgramRow.Meta):
        default_related_name = "impacts"
        verbose_name = "impact number"

    def __str__(self):
        return f"{self.year} {self.metric_bn}"


class Campaign(TimeStamped):
    slug = models.SlugField(unique=True)
    title_bn = models.CharField(max_length=160)
    title_en = models.CharField(max_length=160, blank=True)
    summary_bn = models.TextField()
    summary_en = models.TextField(blank=True)
    body_bn = models.TextField(blank=True)
    body_en = models.TextField(blank=True)
    cover_image = image_field("campaigns/", "cover")
    cover_width = size_field()
    cover_height = size_field()
    cover_alt_bn = models.CharField(max_length=200, blank=True)
    cover_alt_en = models.CharField(max_length=200, blank=True)
    goal_amount = models.PositiveIntegerField()
    # Money raised before the website, or outside it, that the progress bar must include.
    offline_raised = models.PositiveIntegerField(default=0, help_text="Taka raised outside the website")
    offline_donors = models.PositiveIntegerField(default=0, help_text="Donors counted outside the website")
    monthly_options = ArrayField(models.PositiveIntegerField(), default=default_monthly)
    highlighted_option = models.PositiveIntegerField(null=True, blank=True)
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)
    fund = models.ForeignKey(Fund, on_delete=models.PROTECT, related_name="campaigns")
    is_featured = models.BooleanField(default=False)  # home banner; at most one
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-is_featured", "-starts_at"]

    def __str__(self):
        return self.title_bn

    def clean(self):
        if self.is_featured and Campaign.objects.filter(is_featured=True).exclude(pk=self.pk).exists():
            raise ValidationError({"is_featured": "Another campaign is already featured. Unfeature it first."})

    def has_ended(self, now=None):
        return self.ends_at is not None and self.ends_at < (now or timezone.now())


class PostCategory(TimeStamped):
    slug = models.SlugField(unique=True)  # relief, education, health
    name_bn = models.CharField(max_length=60)
    name_en = models.CharField(max_length=60, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "slug"]
        verbose_name_plural = "post categories"

    def __str__(self):
        return self.name_bn


class Post(TimeStamped):
    slug = models.SlugField(unique=True)
    title_bn = models.CharField(max_length=200)
    title_en = models.CharField(max_length=200, blank=True)
    excerpt_bn = models.TextField()
    excerpt_en = models.TextField(blank=True)
    body_bn = models.TextField()  # markdown, sanitized on render
    body_en = models.TextField(blank=True)
    cover_image = image_field("posts/", "cover", blank=False)
    cover_width = size_field()
    cover_height = size_field()
    cover_alt_bn = models.CharField(max_length=200)
    cover_alt_en = models.CharField(max_length=200, blank=True)
    category = models.ForeignKey(PostCategory, on_delete=models.PROTECT, related_name="posts")
    published_at = models.DateTimeField(null=True, blank=True, help_text="Empty = draft. A future date = scheduled.")

    class Meta:
        ordering = ["-published_at"]

    def __str__(self):
        return self.title_bn


class GalleryItem(TimeStamped):
    class Kind(models.TextChoices):
        PHOTO = "photo"
        VIDEO = "video"

    kind = models.CharField(max_length=5, choices=Kind.choices, default=Kind.PHOTO)
    image = image_field("gallery/", "image", blank=False)  # the photo, or the video's thumbnail
    image_width = size_field()
    image_height = size_field()
    youtube_id = models.CharField(max_length=20, blank=True)
    alt_bn = models.CharField(max_length=200, blank=True)
    alt_en = models.CharField(max_length=200, blank=True)
    caption_bn = models.CharField(max_length=200, blank=True)
    caption_en = models.CharField(max_length=200, blank=True)
    category = models.ForeignKey(PostCategory, on_delete=models.PROTECT, related_name="gallery_items")
    taken_at = models.DateField(null=True, blank=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["-taken_at", "-pk"]

    def __str__(self):
        return self.caption_bn or f"{self.kind} {self.pk}"

    def clean(self):
        errors = {}
        if self.kind == self.Kind.PHOTO and not self.alt_bn:
            errors["alt_bn"] = "A photo needs Bengali alt text."
        if self.kind == self.Kind.VIDEO and not self.youtube_id:
            errors["youtube_id"] = "A video needs its YouTube id."
        if errors:
            raise ValidationError(errors)


class Page(TimeStamped):
    """Long editable text: privacy, terms, refund-policy, about, how-we-spend. The set is fixed by `seed`."""

    slug = models.SlugField(unique=True)
    title_bn = models.CharField(max_length=120)
    title_en = models.CharField(max_length=120, blank=True)
    body_bn = models.TextField()  # markdown → sanitized body_html in the API
    body_en = models.TextField(blank=True)
    # updated_at (TimeStamped) is the "সর্বশেষ হালনাগাদ" date on the policy pages

    class Meta:
        ordering = ["slug"]

    def __str__(self):
        return self.title_bn


class Person(TimeStamped):
    """Board members and advisors on /about."""

    name_bn = models.CharField(max_length=120)
    name_en = models.CharField(max_length=120, blank=True)
    role_bn = models.CharField(max_length=120)
    role_en = models.CharField(max_length=120, blank=True)
    bio_bn = models.TextField(blank=True)
    bio_en = models.TextField(blank=True)
    photo = image_field("people/", "photo")
    photo_width = size_field()
    photo_height = size_field()
    photo_alt_bn = models.CharField(max_length=200, blank=True)
    photo_alt_en = models.CharField(max_length=200, blank=True)
    photo_consent = models.BooleanField(default=False, help_text="The photo is shown only with written consent.")
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "pk"]
        verbose_name_plural = "people"

    def __str__(self):
        return self.name_bn


class Report(TimeStamped):
    """A public PDF on /transparency."""

    class Kind(models.TextChoices):
        ANNUAL = "annual"
        AUDIT = "audit"
        REGISTRATION = "registration"
        OTHER = "other"

    kind = models.CharField(max_length=12, choices=Kind.choices)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    title_bn = models.CharField(max_length=200)
    title_en = models.CharField(max_length=200, blank=True)
    file = models.FileField(upload_to="reports/")
    published_at = models.DateField()

    class Meta:
        ordering = ["-published_at", "-pk"]

    def __str__(self):
        return self.title_bn


class Job(TimeStamped):
    """A vacancy on the careers tab of /get-involved."""

    slug = models.SlugField(unique=True)
    title_bn = models.CharField(max_length=160)
    title_en = models.CharField(max_length=160, blank=True)
    body_bn = models.TextField()
    body_en = models.TextField(blank=True)
    location_bn = models.CharField(max_length=120, blank=True)
    location_en = models.CharField(max_length=120, blank=True)
    apply_email = models.EmailField(blank=True)
    apply_url = models.URLField(blank=True)
    closes_at = models.DateField(null=True, blank=True)
    is_open = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.title_bn
