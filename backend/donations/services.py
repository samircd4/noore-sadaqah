"""
Changing a donation's status. mark_paid() is the ONLY code that may set a donation to PAID
(docs/DATA_MODEL.md "Marking a donation PAID").
"""

import base64
import hashlib
import hmac
import logging

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

from .models import Donation, Status

logger = logging.getLogger(__name__)


class CannotMarkPaid(Exception):
    """A CANCELLED or REFUNDED donation is never turned into PAID automatically: a person must check it."""


def next_receipt_no(year):
    """The next receipt number of the year: NSF-2026-000001, NSF-2026-000002, ...
    One SQL statement adds 1 and locks that year's counter until the payment is saved, so two payments at the same
    moment can never get the same number, and no numbers are skipped."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO donations_receiptcounter (year, last) VALUES (%s, 1)
            ON CONFLICT (year) DO UPDATE SET last = donations_receiptcounter.last + 1
            RETURNING last
            """,
            [year],
        )
        last = cursor.fetchone()[0]
    return f"NSF-{year}-{last:06d}"


@transaction.atomic
def mark_paid(donation_id, *, txn_id, payload, paid_at=None):
    """Mark a donation PAID and give it a receipt number. Safe to call twice: the second call changes nothing.
    Returns (donation, changed)."""
    donation = Donation.objects.select_for_update().get(pk=donation_id)  # lock the row: one payment at a time

    if donation.status == Status.PAID:
        return donation, False
    if donation.status not in (Status.PENDING, Status.FAILED):  # FAILED → PAID is fine: the bank confirmed late
        logger.error("payment confirmed for a %s donation %s", donation.status, donation.pk)
        raise CannotMarkPaid(donation.status)

    paid_at = paid_at or timezone.now()
    donation.status = Status.PAID
    donation.paid_at = paid_at
    donation.gateway_txn_id = txn_id or None
    donation.gateway_payload = payload
    donation.fail_reason = ""
    donation.receipt_no = next_receipt_no(timezone.localtime(paid_at).year)  # the year in Dhaka
    donation.save()
    logger.info("donation %s paid", donation.pk)
    # Later in B2: send the receipt SMS and email here (a Celery task, after the save is committed).
    return donation, True


@transaction.atomic
def mark_unpaid(donation_id, status, reason):
    """PENDING → FAILED or CANCELLED. A donation in any other state is left alone."""
    donation = Donation.objects.select_for_update().get(pk=donation_id)
    if donation.status == Status.PENDING:
        donation.status = status
        donation.fail_reason = reason
        donation.save(update_fields=["status", "fail_reason", "updated_at"])
    return donation


def receipt_url(gateway_ref):
    """The short signed receipt link sent by SMS: /r/NSD7K2M9QX4PA-k3j9x2m1qa (docs/API.md "Receipts")."""
    digest = hmac.new(settings.RECEIPT_TOKEN_SECRET.encode(), gateway_ref.encode(), hashlib.sha256).digest()
    signature = base64.b32encode(digest).decode().lower()[:10]
    return f"/r/{gateway_ref}-{signature}"
