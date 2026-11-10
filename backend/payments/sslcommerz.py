"""
Everything about SSLCommerz in one file (docs/DONATION_FLOW.md "SSLCommerz details").

How a card payment works:
  1. start_payment()   we tell SSLCommerz the amount and our transaction id (gateway_ref) and get a payment page URL.
  2. The donor pays on that page. SSLCommerz then calls us:
       - IPN (server to server) and the donor's browser (success / fail / cancel), see views.py.
  3. check_payment()   for "success" / IPN: we ask SSLCommerz's Validation API about the val_id it gave us.
     ask_sslcommerz()  for "fail" / "cancel" / refresh: we ask SSLCommerz about our transaction id.
  4. Only when SSLCommerz itself confirms status, transaction id, amount and BDT do we call mark_paid().
     Nothing posted to us is trusted, because anyone could post it.

Every call to SSLCommerz and every callback is saved as a GatewayEvent (without passwords or card numbers).
"""

import logging
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings

from core.errors import GatewayUnavailable
from core.utils import translated
from donations.models import Donation, Status
from donations.services import CannotMarkPaid, mark_paid, mark_unpaid

from .models import GatewayEvent, without_secrets

logger = logging.getLogger(__name__)

TIMEOUT = 10  # seconds; a slow gateway must not hang the donor's request
PAID = {"VALID", "VALIDATED"}  # SSLCommerz's words for a successful payment
NO_ANSWER = "NO_ANSWER"  # our own status when SSLCommerz couldn't be reached


# ---- 1. Start a payment ------------------------------------------------------------------------------------------


def start_payment(donation, ip=None):
    """Open an SSLCommerz payment session for a PENDING donation and return the payment page URL.
    Raises GatewayUnavailable (the frontend shows "try again") if SSLCommerz doesn't answer or says no."""
    callback = f"{settings.SITE_URL}/api/v1/payments/sslcommerz"
    answer = call_sslcommerz(
        "POST",
        "/gwprocess/v4/api.php",
        {
            "total_amount": donation.amount,
            "currency": "BDT",
            "tran_id": donation.gateway_ref,
            "success_url": f"{callback}/success/",
            "fail_url": f"{callback}/fail/",
            "cancel_url": f"{callback}/cancel/",
            "ipn_url": f"{callback}/ipn/",
            "cus_name": donation.donor_name,
            "cus_email": donation.donor_email or settings.DONATION_FALLBACK_EMAIL,
            "cus_phone": donation.donor_phone,
            "cus_add1": "Bangladesh",
            "cus_city": "Dhaka",
            "cus_country": "Bangladesh",
            "shipping_method": "NO",
            "num_of_item": 1,
            "product_name": translated(donation.fund, "title", donation.locale),
            "product_category": "donation",
            "product_profile": "non-physical-goods",
        },
    )
    log("create", answer, donation, ip)

    if answer.get("status") != "SUCCESS" or not answer.get("GatewayPageURL"):
        logger.error("SSLCommerz refused donation %s: %s", donation.pk, answer.get("failedreason", "no answer"))
        raise GatewayUnavailable

    donation.gateway_session = str(answer.get("sessionkey") or "")[:120]
    donation.save(update_fields=["gateway_session", "updated_at"])
    return answer["GatewayPageURL"]


# ---- 3a. Check a payment by its val_id (success page, IPN) ------------------------------------------------------


def check_payment(val_id, ip=None):
    """Ask the Validation API what really happened to this val_id, and mark the donation PAID if all checks pass.
    Returns the donation, or None if SSLCommerz names a transaction we don't know.
    Raises GatewayUnavailable if SSLCommerz couldn't be reached, so the IPN view can ask SSLCommerz to try again."""
    answer = call_sslcommerz("GET", "/validator/api/validationserverAPI.php", {"val_id": val_id})
    donation = Donation.objects.filter(gateway_ref=str(answer.get("tran_id", ""))).first()
    log("validate", answer, donation, ip)
    if answer.get("status") == NO_ANSWER:
        raise GatewayUnavailable
    if donation:
        confirm(donation, answer, ip)
    return donation


# ---- 3b. Ask about our transaction id (fail, cancel, refresh, IPN without val_id) --------------------------------


def ask_sslcommerz(donation, browser_says=None, kind="query", ip=None):
    """Ask SSLCommerz about this donation's transaction id and update the donation to match.

    browser_says is "failed" or "cancelled" when the donor's browser came back that way. We only believe it when
    SSLCommerz has no record of a payment at all (then nothing was charged)."""
    answer = call_sslcommerz(
        "GET", "/validator/api/merchantTransIDvalidationAPI.php", {"tran_id": donation.gateway_ref}
    )
    log(kind, answer, donation, ip)

    payments = [p for p in answer.get("element") or [] if isinstance(p, dict)]
    statuses = {p.get("status") for p in payments}

    for payment in payments:
        if payment.get("status") in PAID:
            confirm(donation, payment, ip)
            return Donation.objects.get(pk=donation.pk)

    if statuses & {"PENDING", "UNATTEMPTED"}:
        return donation  # the donor may still be paying (for example a second card after a declined one)
    if "FAILED" in statuses:
        return mark_unpaid(donation.pk, Status.FAILED, "declined")
    if "CANCELLED" in statuses:
        return mark_unpaid(donation.pk, Status.CANCELLED, "cancelled")
    if "EXPIRED" in statuses:
        return mark_unpaid(donation.pk, Status.FAILED, "expired")
    if not payments and answer.get("APIConnect") == "DONE" and browser_says == "failed":
        return mark_unpaid(donation.pk, Status.FAILED, "declined")
    if not payments and answer.get("APIConnect") == "DONE" and browser_says == "cancelled":
        return mark_unpaid(donation.pk, Status.CANCELLED, "cancelled")
    return donation  # still in progress, or SSLCommerz didn't answer: leave it PENDING


# ---- 4. The checks before mark_paid() ---------------------------------------------------------------------------


def confirm(donation, answer, ip=None):
    """Mark PAID only if SSLCommerz's own answer matches this donation exactly."""
    if answer.get("status") not in PAID:
        return
    problems = []
    if answer.get("tran_id") != donation.gateway_ref:
        problems.append("tran_id")
    if not same_amount(answer.get("amount"), donation.amount):
        problems.append("amount")
    if answer.get("currency") != "BDT" or answer.get("currency_type", "BDT") != "BDT":
        problems.append("currency")

    if problems:
        # Someone may be trying to pay less than they claim. Keep the evidence; a person will look at it.
        log("mismatch", answer, donation, ip, status=",".join(problems))
        logger.error("SSLCommerz answer doesn't match donation %s: %s", donation.pk, problems)
        return

    try:
        mark_paid(donation.pk, txn_id=answer.get("bank_tran_id"), payload=without_secrets(answer))
    except CannotMarkPaid as exc:
        log("alert", answer, donation, ip, status=f"paid_while_{exc}")


def same_amount(sslcommerz_amount, our_amount):
    """SSLCommerz sends "500.00"; we store 500."""
    try:
        return Decimal(str(sslcommerz_amount)) == Decimal(our_amount)
    except InvalidOperation:
        return False


# ---- Talking to SSLCommerz --------------------------------------------------------------------------------------


def call_sslcommerz(method, path, params):
    """One HTTP call with our store id and password added. Returns SSLCommerz's JSON answer, or
    {"status": "NO_ANSWER"} on a timeout, a network error or a reply that isn't JSON."""
    host = "https://sandbox.sslcommerz.com" if settings.SSLCOMMERZ_SANDBOX else "https://securepay.sslcommerz.com"
    params = {
        **params,
        "store_id": settings.SSLCOMMERZ_STORE_ID,
        "store_passwd": settings.SSLCOMMERZ_STORE_PASSWORD,
        "format": "json",
    }
    try:
        if method == "POST":
            response = requests.post(host + path, data=params, timeout=TIMEOUT)
        else:
            response = requests.get(host + path, params=params, timeout=TIMEOUT)
        response.raise_for_status()
        answer = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("SSLCommerz %s gave no answer: %s", path, type(exc).__name__)
        return {"status": NO_ANSWER, "error": type(exc).__name__}
    if not isinstance(answer, dict):  # e.g. an error message sent as a JSON string
        logger.warning("SSLCommerz %s answered something that isn't an object", path)
        return {"status": NO_ANSWER, "error": "not_an_object"}
    return answer


def log(kind, payload, donation=None, ip=None, status=None):
    """Save what happened as a GatewayEvent (visible in /admin/)."""
    GatewayEvent.objects.create(
        provider="sslcommerz",
        kind=kind,
        donation=donation,
        gateway_ref=donation.gateway_ref if donation else str(payload.get("tran_id", ""))[:80],
        status=str(status or payload.get("status") or payload.get("APIConnect") or "")[:40],
        payload=without_secrets(payload),
        ip=ip,
    )
