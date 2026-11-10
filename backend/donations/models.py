"""
Donations (DATA_MODEL.md "donations"). Only services.mark_paid() sets a donation PAID (backend/CLAUDE.md rule 4).

Not in this slice yet: `subscription` and `due_on` (monthly giving, ROADMAP B4).
"""

import secrets
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from content.models import Campaign, Fund
from core.models import TimeStamped

BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"


def new_gateway_ref():
    """Our transaction id sent to the gateway (SSLCommerz tran_id), e.g. "NSD7K2M9QX4PA"."""
    return "NSD" + "".join(secrets.choice(BASE32) for _ in range(10))


class Method(models.TextChoices):
    SSLCOMMERZ = "sslcommerz"  # online: cards, Nagad, Rocket, net banking via SSLCommerz
    BKASH = "bkash"  # online: bKash Tokenized Checkout
    BANK_TRANSFER = "bank_transfer"  # offline, entered by staff
    CASH = "cash"
    BKASH_OFFLINE = "bkash_offline"
    NAGAD_OFFLINE = "nagad_offline"
    ROCKET_OFFLINE = "rocket_offline"


ONLINE_METHODS = {Method.SSLCOMMERZ, Method.BKASH}


class Status(models.TextChoices):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class Kind(models.TextChoices):
    ONE_TIME = "one_time"
    MONTHLY = "monthly"


class Donation(TimeStamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)  # public id in URLs
    gateway_ref = models.CharField(max_length=30, unique=True, default=new_gateway_ref)
    receipt_no = models.CharField(max_length=20, unique=True, null=True, blank=True)  # NSF-2026-000123
    amount = models.PositiveIntegerField()
    fund = models.ForeignKey(Fund, on_delete=models.PROTECT)
    campaign = models.ForeignKey(Campaign, null=True, blank=True, on_delete=models.PROTECT)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.ONE_TIME)

    donor_name = models.CharField(max_length=120)
    donor_phone = models.CharField(max_length=11)  # 01XXXXXXXXX
    donor_email = models.EmailField(blank=True)
    on_behalf_of = models.CharField(max_length=120, blank=True)
    on_behalf_permission = models.BooleanField(default=False)
    is_anonymous = models.BooleanField(default=False)
    locale = models.CharField(max_length=2, default="bn")

    # fitra (ZAKAT_POLICY F1–F2): refused by the API until fitra opens
    fitra_people = models.PositiveSmallIntegerField(null=True, blank=True)
    fitra_item = models.CharField(max_length=60, blank=True)
    fitra_rate = models.PositiveIntegerField(null=True, blank=True)
    is_advance_zakat = models.BooleanField(default=False)

    method = models.CharField(max_length=16, choices=Method.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    gateway_session = models.CharField(max_length=120, blank=True)  # SSLCommerz sessionkey / bKash paymentID
    gateway_txn_id = models.CharField(max_length=80, unique=True, null=True, blank=True)  # bank_tran_id / trxID
    gateway_payload = models.JSONField(null=True, blank=True)  # last validation response (no secrets)
    fail_reason = models.CharField(max_length=200, blank=True)  # a key from FAIL_REASONS, or staff text

    reference = models.CharField(max_length=120, blank=True)  # offline entries (ADMIN.md)
    note = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, related_name="+", on_delete=models.PROTECT
    )

    refund_ref = models.CharField(max_length=120, blank=True)
    refund_reason = models.TextField(blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    refunded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, related_name="+", on_delete=models.PROTECT
    )

    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["fund", "status"]),
            models.Index(fields=["donor_phone"]),
            models.Index(fields=["campaign", "status"]),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gte=1), name="donation_amount_positive"),
            models.CheckConstraint(
                condition=~Q(status="paid") | (Q(receipt_no__isnull=False) & Q(paid_at__isnull=False)),
                name="paid_has_receipt",
            ),
        ]

    def __str__(self):
        return self.gateway_ref

    def save(self, *args, **kwargs):
        # Zakat lock (DATA_MODEL.md "Other rules", root CLAUDE.md rule 12): the fund never changes once saved.
        # Status updates save only named fields; the check runs whenever the fund could be written.
        update_fields = kwargs.get("update_fields")
        if not self._state.adding and (update_fields is None or "fund" in update_fields or "fund_id" in update_fields):
            stored = type(self).objects.filter(pk=self.pk).values_list("fund_id", flat=True).first()
            if stored is not None and stored != self.fund_id:
                raise ValidationError("A donation's fund can't be changed.")
        super().save(*args, **kwargs)


class ReceiptCounter(models.Model):
    """Last receipt number per Asia/Dhaka year; incremented with an atomic upsert (services.next_receipt_no)."""

    year = models.PositiveSmallIntegerField(primary_key=True)
    last = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.year}: {self.last}"


# What the status endpoint shows donors for a failed or cancelled donation (fail_reason keys).
FAIL_REASONS = {
    "declined": {"bn": "পেমেন্ট সম্পন্ন হয়নি।", "en": "The payment didn't go through."},
    "cancelled": {"bn": "আপনি পেমেন্ট বাতিল করেছেন।", "en": "You cancelled the payment."},
    "expired": {"bn": "পেমেন্টের সময় শেষ হয়ে গেছে।", "en": "The payment session expired."},
}
