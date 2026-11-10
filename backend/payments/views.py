"""
The four URLs SSLCommerz calls (docs/API.md "Payment gateway callbacks"):

    /api/v1/payments/sslcommerz/ipn/      SSLCommerz's server tells us about a payment
    /api/v1/payments/sslcommerz/success/  the donor's browser comes back after paying
    /api/v1/payments/sslcommerz/fail/     ... after the payment failed
    /api/v1/payments/sslcommerz/cancel/   ... after the donor cancelled

SSLCommerz posts normal HTML forms from its own site, so these views skip Django's CSRF check. That's safe because
we never trust what is posted: sslcommerz.py asks SSLCommerz directly before changing anything.
"""

from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from core.errors import GatewayUnavailable
from core.utils import client_ip
from donations.models import Donation

from . import sslcommerz


@csrf_exempt
@require_POST
def ipn(request):
    donation, data, ip = received(request, "ipn")
    if data.get("val_id"):
        try:
            sslcommerz.check_payment(data["val_id"], ip=ip)
        except GatewayUnavailable:
            # We couldn't check it with SSLCommerz: a non-200 answer makes SSLCommerz send the IPN again later.
            return HttpResponse("Try again later", status=503)
    elif donation:
        sslcommerz.ask_sslcommerz(donation, ip=ip)
    return HttpResponse("OK")


@csrf_exempt
@require_POST
def success(request):
    donation, data, ip = received(request, "success_redirect")
    if data.get("val_id"):
        try:
            donation = sslcommerz.check_payment(data["val_id"], ip=ip) or donation
        except GatewayUnavailable:
            pass  # the success page shows "verifying" and asks again (refresh), the IPN may also arrive
    # The success page asks our API for the status, so an unconfirmed payment shows "verifying", never "paid".
    return go_to(donation, "success")


@csrf_exempt
@require_POST
def fail(request):
    donation, _data, ip = received(request, "failed_redirect")
    if donation:
        donation = sslcommerz.ask_sslcommerz(donation, browser_says="failed", ip=ip)
    return go_to(donation, "failed")


@csrf_exempt
@require_POST
def cancel(request):
    donation, _data, ip = received(request, "cancelled_redirect")
    if donation:
        donation = sslcommerz.ask_sslcommerz(donation, browser_says="cancelled", ip=ip)
    return go_to(donation, "failed")


def received(request, kind):
    """Save the callback as a GatewayEvent and find the donation it names (by our transaction id)."""
    data = request.POST.dict()
    ip = client_ip(request)
    donation = Donation.objects.filter(gateway_ref=data.get("tran_id", "")[:30]).first()
    sslcommerz.log(kind, data, donation, ip)
    return donation, data, ip


def go_to(donation, page):
    """Send the browser to the website's /bn/donate/success?id=... (or /en/..., in the donor's language)."""
    if donation is None:
        url = f"{settings.SITE_URL}/bn/donate"
    else:
        language = "en" if donation.locale == "en" else "bn"
        url = f"{settings.SITE_URL}/{language}/donate/{page}?id={donation.pk}"
    response = HttpResponseRedirect(url)
    response.status_code = 303  # "see other": the browser follows with a GET
    return response
