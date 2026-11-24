from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Who changed what in the admin (ADMIN.md "Audit log"). Read only for everyone; never deleted."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    action = models.CharField(max_length=60)  # fund.update, sitesettings.update, user.create …
    target = models.CharField(max_length=80)  # "content.Fund:3"
    data = models.JSONField(null=True, blank=True)  # {"before": {...}, "after": {...}}, changed fields only
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["target", "-created_at"])]
        verbose_name = "audit log entry"
        verbose_name_plural = "audit log"

    def __str__(self):
        return f"{self.action} {self.target}"
