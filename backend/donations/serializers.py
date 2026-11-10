"""
Checks the donation form sent to POST /donations/. Same rules and error codes as the frontend
(frontend/src/lib/validation/donation.js); the error messages ARE the codes the frontend translates.
"""

import re

from django.conf import settings
from rest_framework import serializers

from content.models import Campaign, Fund
from core.models import SiteSetting
from core.utils import normalize_mobile, to_latin_digits

MAX_AMOUNT = 10_000_000

# Error messages for each kind of field = the frontend's error codes.
TEXT = {
    "required": "required",
    "blank": "required",
    "null": "required",
    "max_length": "tooLong",
    "invalid": "choiceInvalid",
}
CHOICE = {"required": "required", "null": "required", "invalid_choice": "choiceInvalid"}
YES_NO = {"invalid": "choiceInvalid", "null": "choiceInvalid"}


class AmountField(serializers.Field):
    """Whole taka from 1 to 1 crore. Accepts 1000, "1000" or "১,০০০"."""

    def to_internal_value(self, data):
        if data is None or data == "":
            raise serializers.ValidationError("required")
        text = re.sub(r"[\s,]", "", to_latin_digits(data))
        if isinstance(data, bool) or not text.isdigit() or int(text) < 1:
            raise serializers.ValidationError("amountInvalid")
        if int(text) > MAX_AMOUNT:
            raise serializers.ValidationError([{"code": "maxAmount", "max": MAX_AMOUNT}])
        return int(text)


class MobileField(serializers.CharField):
    """A Bangladeshi mobile number, saved as 01XXXXXXXXX."""

    def to_internal_value(self, data):
        mobile = normalize_mobile(super().to_internal_value(data))
        if not mobile:
            raise serializers.ValidationError("mobileInvalid")
        return mobile


class MethodField(serializers.ChoiceField):
    """bkash or sslcommerz. An empty value is "required" (like the frontend), not "choiceInvalid"."""

    def to_internal_value(self, data):
        if data == "":
            self.fail("required")
        return super().to_internal_value(data)


def methods_we_can_take():
    """Payment methods that work right now. bKash is added when its code is written (ROADMAP B2)."""
    listed = SiteSetting.get("payment_methods", ["bkash", "sslcommerz"])
    ready = ["sslcommerz"] if settings.SSLCOMMERZ_STORE_ID else []
    return [method for method in listed if method in ready]


class DonationSerializer(serializers.Serializer):
    fund = serializers.CharField(error_messages=TEXT)
    campaign = serializers.CharField(required=False, allow_blank=True, max_length=80, default="", error_messages=TEXT)
    amount = AmountField(error_messages=TEXT)
    kind = serializers.ChoiceField(["one_time", "monthly"], default="one_time", error_messages=CHOICE)
    donor_name = serializers.CharField(max_length=120, error_messages=TEXT)
    donor_phone = MobileField(error_messages=TEXT)
    donor_email = serializers.EmailField(
        required=False, allow_blank=True, default="", error_messages={**TEXT, "invalid": "emailInvalid"}
    )
    on_behalf_of = serializers.CharField(
        required=False, allow_blank=True, max_length=120, default="", error_messages=TEXT
    )
    on_behalf_permission = serializers.BooleanField(required=False, default=False, error_messages=YES_NO)
    is_anonymous = serializers.BooleanField(required=False, default=False, error_messages=YES_NO)
    method = MethodField(["bkash", "sslcommerz"], error_messages=CHOICE)
    locale = serializers.ChoiceField(["bn", "en"], default="bn", error_messages=CHOICE)

    def validate_fund(self, slug):
        fund = Fund.objects.filter(slug=slug, is_active=True).first()
        if not fund:
            raise serializers.ValidationError("fundInactive")
        return fund  # from here on data["fund"] is the Fund object

    def validate_donor_email(self, email):
        return email.lower()

    def validate(self, data):
        """Checks that need more than one field. All problems are reported together."""
        fund = data["fund"]
        errors = {}

        if data["amount"] < fund.min_amount:
            errors["amount"] = [{"code": "minAmount", "min": fund.min_amount}]

        fitra = SiteSetting.get("fitra", {}) or {}
        if fund.is_fitra and not fitra.get("open"):  # fitra waits for the zakat policy sign-off
            errors["fund"] = ["fitraClosed"]

        if data["kind"] == "monthly":  # needs donor login and subscriptions (ROADMAP B3–B4)
            errors["kind"] = ["recurringNotAllowed"]

        if not data["on_behalf_of"]:
            data["on_behalf_permission"] = False
        elif not data["on_behalf_permission"]:
            errors["on_behalf_permission"] = ["onBehalfPermission"]

        data["campaign"] = self.check_campaign(data["campaign"], fund, errors)

        if data["method"] not in methods_we_can_take():
            errors["method"] = ["choiceInvalid"]

        if errors:
            raise serializers.ValidationError(errors)
        return data

    def check_campaign(self, slug, fund, errors):
        """The Campaign object, or None. It must belong to the chosen fund and not have ended."""
        if not slug:
            return None
        campaign = Campaign.objects.filter(slug=slug, is_active=True).first()
        if not campaign or campaign.fund_id != fund.pk:
            errors["campaign"] = ["choiceInvalid"]
        elif campaign.has_ended():
            errors["campaign"] = ["campaignEnded"]
        else:
            return campaign
        return None
