"""
The three donation endpoints the website calls (docs/API.md "Donations"):

    POST /api/v1/donations/               create a PENDING donation, answer with the SSLCommerz payment page URL
    GET  /api/v1/donations/<id>/status/   the donation's status for the success / failed page (no personal data)
    POST /api/v1/donations/<id>/refresh/  same, but after 2 minutes we also ask SSLCommerz once
"""

from datetime import timedelta

from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from core.utils import client_ip, request_language, translated
from payments import sslcommerz
from payments.models import GatewayEvent

from .models import FAIL_REASONS, Donation, Status
from .serializers import DonationSerializer
from .services import receipt_url


class TenPerTenMinutes(SimpleRateThrottle):
    """At most 10 new donations per visitor IP in 10 minutes (stops card testing)."""

    rate = "10 per 10 minutes"

    def parse_rate(self, rate):
        return 10, 10 * 60  # (requests, seconds): DRF's own rate strings can't say "10 minutes"

    def get_cache_key(self, request, view):
        return f"throttle_donation_create_{client_ip(request)}"


@api_view(["POST"])
@throttle_classes([TenPerTenMinutes])
def create_donation(request):
    form = DonationSerializer(data=request.data)
    form.is_valid(raise_exception=True)  # a 400 with the error codes if something is wrong
    data = form.validated_data

    donation = Donation.objects.create(
        fund=data["fund"],
        campaign=data["campaign"],
        amount=data["amount"],
        kind=data["kind"],
        donor_name=data["donor_name"],
        donor_phone=data["donor_phone"],
        donor_email=data["donor_email"],
        on_behalf_of=data["on_behalf_of"],
        on_behalf_permission=data["on_behalf_permission"],
        is_anonymous=data["is_anonymous"],
        locale=data["locale"],
        method=data["method"],
    )

    # Raises GatewayUnavailable (502) if SSLCommerz doesn't answer; the donation then simply stays PENDING.
    payment_page = sslcommerz.start_payment(donation, ip=client_ip(request))

    return Response(
        {
            "id": str(donation.pk),
            "redirect_url": payment_page,
            "expires_at": (timezone.now() + timedelta(minutes=30)).isoformat(),
        },
        status=201,
    )


@api_view(["GET"])
def donation_status(request, donation_id):
    donation = get_object_or_404(Donation, pk=donation_id)
    return Response(status_json(donation, request_language(request)))


@api_view(["POST"])
def refresh_donation(request, donation_id):
    """The success page calls this every 5 seconds while the payment is PENDING. If it is still PENDING after
    2 minutes, we ask SSLCommerz about it, once."""
    donation = get_object_or_404(Donation, pk=donation_id)
    waited_long_enough = timezone.now() - donation.created_at >= timedelta(minutes=2)
    # A query that got no answer doesn't count, so the next refresh tries again.
    already_asked = (
        GatewayEvent.objects.filter(donation=donation, kind="refresh_query")
        .exclude(status=sslcommerz.NO_ANSWER)
        .exists()
    )

    # cache.add() only succeeds for the first caller in 30 s: two tabs polling at once send one query, not two.
    if (
        donation.status == Status.PENDING
        and waited_long_enough
        and not already_asked
        and cache.add(f"refresh_query_{donation.pk}", 1, 30)
    ):
        donation = sslcommerz.ask_sslcommerz(donation, kind="refresh_query", ip=client_ip(request))

    return Response(status_json(donation, request_language(request)))


def status_json(donation, language):
    """What the success / failed page may know. Never the donor's name, phone or email."""
    body = {
        "id": str(donation.pk),
        "status": donation.status,
        "amount": donation.amount,
        "fund": {"slug": donation.fund.slug, "title": translated(donation.fund, "title", language)},
        "kind": donation.kind,
        "receipt_no": donation.receipt_no,
        "paid_at": donation.paid_at.isoformat().replace("+00:00", "Z") if donation.paid_at else None,
        "fail_reason": None,
    }
    if donation.status in (Status.FAILED, Status.CANCELLED) and donation.fail_reason:
        reason = FAIL_REASONS.get(donation.fail_reason)
        body["fail_reason"] = reason[language] if reason else donation.fail_reason
    if donation.status == Status.PAID:
        body["receipt_url"] = receipt_url(donation.gateway_ref)
    return body
