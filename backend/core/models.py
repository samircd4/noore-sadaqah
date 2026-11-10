from django.db import models


class TimeStamped(models.Model):
    """created_at / updated_at on every model (DATA_MODEL.md "Conventions")."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SiteSetting(TimeStamped):
    """Editable site-wide values by key (DATA_MODEL.md "core"): contact, mobile_banking, fitra, payment_methods …"""

    key = models.CharField(max_length=40, primary_key=True)
    value = models.JSONField()

    def __str__(self):
        return self.key

    @classmethod
    def get(cls, key, default=None):
        row = cls.objects.filter(key=key).first()
        return row.value if row else default
