"""Small helpers used by several apps."""

import re

from django.conf import settings
from django.utils import timezone


def client_ip(request):
    """The visitor's IP. The Next.js server sends it in X-Forwarded-For; we only believe that header when the
    request really comes from that server (127.0.0.1), so nobody can fake their IP to dodge the rate limit."""
    remote = request.META.get("REMOTE_ADDR")
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
    if remote in settings.TRUSTED_PROXY_IPS and forwarded:
        return forwarded
    return remote


def request_language(request):
    """'en' if the request asks for English (Accept-Language), otherwise 'bn'."""
    return "en" if request.headers.get("Accept-Language", "").lower().startswith("en") else "bn"


def translated(obj, field, language):
    """obj.title_en in English when it is filled in, otherwise obj.title_bn."""
    if language == "en" and getattr(obj, f"{field}_en", ""):
        return getattr(obj, f"{field}_en")
    return getattr(obj, f"{field}_bn")


def to_latin_digits(text):
    """'১,০০০' → '1,000'"""
    return str(text).translate(str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789"))


def normalize_mobile(text):
    """A Bangladeshi mobile as 01XXXXXXXXX ('+880 1712-345678' → '01712345678'), or None if it isn't one.
    Same rule as frontend/src/lib/phone.js."""
    digits = re.sub(r"[\s\-().]", "", to_latin_digits(text or ""))
    match = re.fullmatch(r"(?:\+?88)?(01[3-9]\d{8})", digits)
    return match.group(1) if match else None


# ---- Showing numbers, money and dates (docs/I18N.md; the same output as frontend/src/lib/format.js) --------------

BENGALI_DIGITS = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
ENGLISH_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]  # fmt: skip
BENGALI_MONTHS = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
]  # fmt: skip


def bn_number(value, language="bn"):
    """12500 → '১২,৫০০' with lakh grouping (100000 → '১,০০,০০০'); in English '12,500'."""
    n = int(value)
    if language == "en":
        return f"{n:,}"
    digits = str(abs(n))
    head, groups = digits[:-3], [digits[-3:]]
    while head:  # above the last three digits, Bengali groups by two: 1,00,00,000
        groups.insert(0, head[-2:])
        head = head[:-2]
    return ("-" if n < 0 else "") + ",".join(groups).translate(BENGALI_DIGITS)


def taka(amount, language="bn"):
    """1000 → '৳১,০০০' (bn) or '৳1,000' (en)."""
    return f"৳{bn_number(amount, language)}"


def bn_date(moment, language="bn"):
    """The day in Dhaka: '২৪ নভেম্বর ২০২৬' (bn) or '24 November 2026' (en).
    Fixed month names, never the server's locale."""
    local = timezone.localtime(moment)
    if language == "en":
        return f"{local.day} {ENGLISH_MONTHS[local.month - 1]} {local.year}"
    return f"{local.day} {BENGALI_MONTHS[local.month - 1]} {local.year}".translate(BENGALI_DIGITS)
