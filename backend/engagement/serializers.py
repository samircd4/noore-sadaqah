"""
The public forms (API.md "Forms"). Same rules and error codes as frontend/src/lib/validation/forms.js; the
error messages ARE the codes the frontend translates.
"""

from django.core.validators import validate_email
from rest_framework import serializers

from core.utils import normalize_mobile
from donations.serializers import TEXT, MobileField

from .districts import DISTRICT_CHOICES

AVAILABILITY = ["", "weekdays", "weekends", "flexible"]


def is_email(text):
    try:
        validate_email(text)
    except Exception:
        return False
    return True


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, error_messages=TEXT)
    contact = serializers.CharField(max_length=120, error_messages=TEXT, help_text="A BD mobile or an email")
    subject = serializers.CharField(max_length=150, error_messages=TEXT)
    message = serializers.CharField(max_length=2000, error_messages=TEXT)

    def validate_contact(self, value):
        """A mobile is saved as 01XXXXXXXXX, an email in lower case."""
        if mobile := normalize_mobile(value):
            return mobile
        if is_email(value):
            return value.lower()
        raise serializers.ValidationError("contactInvalid")


class VolunteerSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, error_messages=TEXT)
    phone = MobileField(error_messages=TEXT)
    email = serializers.EmailField(
        required=False, allow_blank=True, default="", error_messages={**TEXT, "invalid": "emailInvalid"}
    )
    district = serializers.ChoiceField(
        [slug for slug, _ in DISTRICT_CHOICES],
        error_messages={"required": "required", "null": "required", "invalid_choice": "districtInvalid"},
    )
    skills = serializers.CharField(required=False, allow_blank=True, default="", max_length=500, error_messages=TEXT)
    availability = serializers.ChoiceField(
        AVAILABILITY, required=False, default="", error_messages={"invalid_choice": "choiceInvalid"}
    )

    def validate_email(self, value):
        return value.lower()

    def to_internal_value(self, data):
        # An empty district is "required" (like the frontend), not "districtInvalid".
        if isinstance(data, dict) and data.get("district") == "":
            data = {**data}
            data.pop("district")
        return super().to_internal_value(data)


class SubscriberSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254, error_messages={**TEXT, "invalid": "emailInvalid"})

    def validate_email(self, value):
        return value.lower()


class UnsubscribeSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=64, error_messages=TEXT)
