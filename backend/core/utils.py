"""Small helpers used by several apps."""

import re

from django.conf import settings


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
