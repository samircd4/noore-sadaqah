"""Scheduled payment jobs (Celery beat, config/settings.py CELERY_BEAT_SCHEDULE)."""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from donations.models import Donation, Kind, Method, Status

from .sslcommerz import ask_sslcommerz

logger = logging.getLogger(__name__)

STALE_AFTER = timedelta(hours=24)
BATCH = 500  # more than this in one night means something else is wrong; the rest wait for the next night


@shared_task(acks_late=True)
def cleanup_pending():
    """Daily at 03:00 Dhaka (DONATION_FLOW.md rule 5): ask SSLCommerz once about each donation still PENDING after
    24 hours and settle it as PAID, FAILED or CANCELLED. If SSLCommerz can't be reached it stays PENDING for the next
    night. Safe to run twice: only PENDING donations are touched, and mark_paid() / mark_unpaid() lock the row.
    bKash donations are refused until bKash lands (ROADMAP B2), so only SSLCommerz is asked. Monthly donations are
    left alone: a REMINDER month stays PENDING for 7 days and settles by its own rules (DONATION_FLOW.md, B4)."""
    stale = Donation.objects.filter(
        status=Status.PENDING,
        kind=Kind.ONE_TIME,
        method=Method.SSLCOMMERZ,
        created_at__lt=timezone.now() - STALE_AFTER,
    ).order_by("created_at")[:BATCH]
    settled = 0
    for donation in list(stale):
        try:
            donation = ask_sslcommerz(donation, kind="cleanup_query", give_up=True)
        except Exception as exc:  # one bad row must not stop the others
            logger.error("cleanup of donation %s failed: %s", donation.pk, type(exc).__name__)
            continue
        settled += donation.status != Status.PENDING
    logger.info("cleanup_pending settled %s donations", settled)
    return settled
