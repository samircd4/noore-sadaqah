"""
Messages to donors, sent by Celery after the database change is committed (docs/NOTIFICATIONS.md).
Every message is recorded as an OutboundMessage. Logs carry ids only, never addresses (backend/CLAUDE.md rule 8).
"""

import logging
import smtplib
from datetime import timedelta

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from donations.models import Donation, Status

from .emails import receipt_email
from .models import OutboundMessage
from .providers import send_email

logger = logging.getLogger(__name__)

RETRY_DELAYS = [60, 5 * 60, 30 * 60]  # 1, 5 and 30 minutes (NOTIFICATIONS.md)
SENDING_TIMEOUT = timedelta(minutes=10)  # a "queued" row older than this belongs to a worker that died


@shared_task(bind=True, acks_late=True, max_retries=len(RETRY_DELAYS))
def send_receipt(self, donation_id):
    """Email the receipt (PDF attached) when a donation is PAID and the donor gave an email.
    Safe to run twice: a receipt already sent, or being sent by another worker, is not sent again.
    The donation row is locked only for the short claim, never while the PDF is made or the mail server answers.
    The receipt SMS joins this task later (ROADMAP B2)."""
    claim = claim_receipt(donation_id)
    if claim == "busy":  # another worker is sending it right now; look again once it must have finished
        raise self.retry(countdown=SENDING_TIMEOUT.seconds)
    if isinstance(claim, str):
        return claim
    donation, message = claim

    try:
        subject, html, text, attachments = receipt_email(donation)
        provider_ref = send_email(donation.donor_email, subject, html, text, attachments)
    except Exception as exc:  # anything at all: record it (type only, its text may hold the address) and retry
        OutboundMessage.objects.filter(pk=message.pk).update(
            status=OutboundMessage.FAILED, error=type(exc).__name__, updated_at=timezone.now()
        )
        logger.warning("receipt email for donation %s failed: %s", donation_id, type(exc).__name__)
        if not is_permanent(exc) and self.request.retries < self.max_retries:
            raise self.retry(countdown=RETRY_DELAYS[self.request.retries]) from None
        return "failed"

    OutboundMessage.objects.filter(pk=message.pk).update(
        status=OutboundMessage.SENT, provider_ref=provider_ref, error="", updated_at=timezone.now()
    )
    logger.info("receipt email for donation %s sent", donation_id)
    return "sent"


@transaction.atomic
def claim_receipt(donation_id):
    """Decide whether this run sends the receipt, and mark the OutboundMessage "queued" (= being sent) if it does.
    Returns (donation, message), or why not: "skipped", "already_sent" or "busy"."""
    donation = Donation.objects.select_for_update().select_related("fund").filter(pk=donation_id).first()
    if donation is None or donation.status != Status.PAID or not donation.donor_email:
        return "skipped"
    message = OutboundMessage.objects.filter(donation=donation, channel="email", template="receipt").first()
    if message is None:  # one receipt = one row, reused by every retry
        message = OutboundMessage(donation=donation, channel="email", template="receipt", to=donation.donor_email)
    elif message.status == OutboundMessage.SENT:
        return "already_sent"
    elif message.status == OutboundMessage.QUEUED and timezone.now() - message.updated_at < SENDING_TIMEOUT:
        return "busy"
    message.status = OutboundMessage.QUEUED
    message.save()  # also moves updated_at: the claim's time
    return donation, message


def is_permanent(exc):
    """Errors that trying again won't fix: the server refused the address or said no for good (5xx)."""
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        return True
    return isinstance(exc, smtplib.SMTPResponseException) and exc.smtp_code >= 500
