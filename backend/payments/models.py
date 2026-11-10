from django.db import models

from donations.models import Donation

# Never saved: gateway passwords, signatures and card numbers.
SECRET_FIELDS = {"store_passwd", "verify_sign", "verify_sign_sha2", "verify_key", "card_no", "card_number", "cvv"}


def without_secrets(data):
    """A copy of a gateway answer with the secret fields removed (also inside nested lists and dicts)."""
    if isinstance(data, dict):
        return {k: without_secrets(v) for k, v in data.items() if str(k).lower() not in SECRET_FIELDS}
    if isinstance(data, list):
        return [without_secrets(v) for v in data]
    return data


class GatewayEvent(models.Model):
    """One call to or from a payment gateway, kept as evidence for disputes. Never deleted.
    kind: create, validate, query, refresh_query, ipn, success_redirect, failed_redirect, cancelled_redirect,
    mismatch, alert."""

    provider = models.CharField(max_length=12)  # sslcommerz | bkash
    kind = models.CharField(max_length=30)
    donation = models.ForeignKey(Donation, null=True, blank=True, on_delete=models.PROTECT, related_name="events")
    gateway_ref = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=40, blank=True)
    payload = models.JSONField()
    ip = models.GenericIPAddressField(null=True, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-received_at"]
        indexes = [models.Index(fields=["gateway_ref"]), models.Index(fields=["donation", "kind"])]

    def __str__(self):
        return f"{self.provider} {self.kind} {self.status}"
