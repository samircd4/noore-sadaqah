"""Messages, volunteer sign-ups and newsletter subscribers from the public forms (DATA_MODEL.md "engagement")."""

import secrets

from django.conf import settings
from django.db import models

from core.models import TimeStamped

from .districts import DISTRICT_CHOICES


def new_unsubscribe_token():
    return secrets.token_urlsafe(32)


class ContactMessage(TimeStamped):
    name = models.CharField(max_length=120)
    contact = models.CharField(max_length=254)  # 01XXXXXXXXX or a lower-case email
    subject = models.CharField(max_length=150)
    message = models.TextField(max_length=2000)
    handled = models.BooleanField(default=False)
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, related_name="+", on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ["handled", "-created_at"]
        verbose_name = "message"

    def __str__(self):
        return self.subject


class Volunteer(TimeStamped):
    class Availability(models.TextChoices):
        NONE = "", "Not given"
        WEEKDAYS = "weekdays", "Weekdays"
        WEEKENDS = "weekends", "Weekends"
        FLEXIBLE = "flexible", "Flexible"

    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=11)  # 01XXXXXXXXX
    email = models.EmailField(blank=True)
    district = models.CharField(max_length=30, choices=DISTRICT_CHOICES)
    skills = models.TextField(max_length=500, blank=True)
    availability = models.CharField(max_length=10, choices=Availability.choices, blank=True)
    handled = models.BooleanField(default=False)

    class Meta:
        ordering = ["handled", "-created_at"]

    def __str__(self):
        return self.name


class Subscriber(TimeStamped):
    email = models.EmailField(unique=True)  # lower-case
    locale = models.CharField(max_length=2, default="bn")
    unsubscribe_token = models.CharField(max_length=43, unique=True, default=new_unsubscribe_token, editable=False)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        permissions = [("export_subscribers", "Can export newsletter subscribers")]

    def __str__(self):
        return self.email
