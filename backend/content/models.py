"""
Content models (DATA_MODEL.md "content"). This slice has only what donations need: Fund and Campaign.
Programs, posts, gallery, people, reports and jobs arrive with the rest of B1 (ROADMAP).
"""

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone

from core.models import TimeStamped


def default_presets():
    return [100, 200, 500, 1000]


def default_monthly():
    return [500, 1000, 2000]


class Fund(TimeStamped):
    slug = models.SlugField(unique=True)  # sadaqah, zakat, fitra, orphan
    title_bn = models.CharField(max_length=120)
    title_en = models.CharField(max_length=120, blank=True)
    summary_bn = models.TextField()
    summary_en = models.TextField(blank=True)
    body_bn = models.TextField()  # markdown
    body_en = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to="funds/", blank=True)
    cover_alt_bn = models.CharField(max_length=200, blank=True)
    cover_alt_en = models.CharField(max_length=200, blank=True)
    preset_amounts = ArrayField(models.PositiveIntegerField(), default=default_presets)
    min_amount = models.PositiveIntegerField(default=10)
    is_zakat_eligible = models.BooleanField(default=False)
    is_fitra = models.BooleanField(default=False)
    allow_recurring = models.BooleanField(default=True)
    bank_details = models.JSONField(default=list, blank=True)  # [{bank, account_name, branch, number, routing, swift}]
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "slug"]

    def __str__(self):
        return self.title_bn


class Campaign(TimeStamped):
    slug = models.SlugField(unique=True)
    title_bn = models.CharField(max_length=160)
    title_en = models.CharField(max_length=160, blank=True)
    summary_bn = models.TextField()
    summary_en = models.TextField(blank=True)
    body_bn = models.TextField(blank=True)
    body_en = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to="campaigns/", blank=True)
    cover_alt_bn = models.CharField(max_length=200, blank=True)
    cover_alt_en = models.CharField(max_length=200, blank=True)
    goal_amount = models.PositiveIntegerField()
    monthly_options = ArrayField(models.PositiveIntegerField(), default=default_monthly)
    highlighted_option = models.PositiveIntegerField(null=True, blank=True)
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)
    fund = models.ForeignKey(Fund, on_delete=models.PROTECT, related_name="campaigns")
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title_bn

    def has_ended(self, now=None):
        return self.ends_at is not None and self.ends_at < (now or timezone.now())
