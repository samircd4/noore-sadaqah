"""
Every API error looks like this (docs/API.md "Errors"), so the frontend can translate the codes:

    {"error": {"code": "validation", "fields": {"donor_phone": ["mobileInvalid"]}}}
    {"error": {"code": "throttled", "retry_after": 42}}
    {"error": {"code": "notFound"}}
"""

import math

from django.http import Http404
from rest_framework import exceptions
from rest_framework.response import Response


class GatewayUnavailable(exceptions.APIException):
    """SSLCommerz didn't answer (or refused to start a payment)."""

    status_code = 502
    default_code = "gatewayUnavailable"


def api_error_handler(exc, context):
    if isinstance(exc, exceptions.ValidationError):
        return error(400, "validation", fields=clean_fields(exc.detail))
    if isinstance(exc, exceptions.Throttled):
        return error(429, "throttled", retry_after=math.ceil(exc.wait or 1))
    if isinstance(exc, exceptions.ParseError):
        return error(400, "validation", fields={})
    if isinstance(exc, Http404 | exceptions.NotFound):
        return error(404, "notFound")
    if isinstance(exc, exceptions.APIException):
        return error(exc.status_code, exc.default_code)
    return None  # a real bug: Django shows its normal 500 page


def error(status, code, **extra):
    return Response({"error": {"code": code, **extra}}, status=status)


def clean_fields(detail):
    """DRF's error detail → {"field": ["code", ...]}. Our serializers already use the frontend's codes as messages;
    params such as {"code": "minAmount", "min": 10} come back from DRF as strings, so numbers are turned back."""
    if isinstance(detail, list):
        detail = {"non_field_errors": detail}
    fields = {}
    for field, errors in detail.items():
        if not isinstance(errors, list):
            errors = [errors]
        fields[field] = [
            {k: int(v) if str(v).isdigit() else str(v) for k, v in e.items()} if isinstance(e, dict) else str(e)
            for e in errors
        ]
    return fields
