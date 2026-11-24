"""Every SMS and email we send to a donor (DATA_MODEL.md "notifications")."""

from django.db import models

from core.models import TimeStamped
from donations.models import Donation


class OutboundMessage(TimeStamped):
    QUEUED, SENT, FAILED = "queued", "sent", "failed"

    channel = models.CharField(max_length=5)  # sms | email
    template = models.CharField(max_length=40)  # receipt, otp, monthly_failed … (NOTIFICATIONS.md)
    to = models.CharField(max_length=254)  # stored for support, never logged
    donation = models.ForeignKey(Donation, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=10, default=QUEUED)  # queued | sent | failed
    provider_ref = models.CharField(max_length=120, blank=True)  # the email's Message-ID, or the SMS company's id
    error = models.CharField(max_length=300, blank=True)  # the error's type only (its text may hold the address)
    segments = models.PositiveSmallIntegerField(null=True)  # SMS cost tracking

    class Meta:
        indexes = [models.Index(fields=["donation", "channel", "template"])]

    def __str__(self):
        return f"{self.channel} {self.template} {self.status}"
