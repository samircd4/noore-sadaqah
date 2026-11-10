"""SSLCommerz callbacks (TESTING.md "SSLCommerz IPN" cases, API.md "Payment gateway callbacks")."""

import pytest
import requests
from django.test import Client

from donations.models import Donation, Status
from payments.models import GatewayEvent

from .conftest import QUERY_URL, VALIDATE_URL, init_ok, validation_answer

pytestmark = pytest.mark.usefixtures("seeded")


@pytest.fixture
def donation(api, gateway, valid_body):
    init_ok(gateway)
    response = api.post("/api/v1/donations/", {**valid_body, "locale": "en"}, format="json")
    return Donation.objects.get(pk=response.json()["id"])


@pytest.fixture
def browser():
    # Real SSLCommerz posts are cross-site form posts without a CSRF token: the views must accept them.
    return Client(enforce_csrf_checks=True, REMOTE_ADDR="127.0.0.1")


def post(browser, name, data):
    return browser.post(f"/api/v1/payments/sslcommerz/{name}/", data)


def validated(gateway, answer):
    gateway.get(VALIDATE_URL, json=answer)


class TestIpn:
    def test_valid_marks_paid(self, browser, gateway, donation):
        validated(gateway, validation_answer(donation))
        r = post(browser, "ipn", {"tran_id": donation.gateway_ref, "val_id": "VAL123", "status": "VALID"})
        assert r.status_code == 200
        donation.refresh_from_db()
        assert donation.status == Status.PAID and donation.gateway_txn_id == f"BANK{donation.gateway_ref}"
        assert "store_passwd" not in donation.gateway_payload and "card_no" not in donation.gateway_payload
        assert gateway.calls[-1].request.params["val_id"] == "VAL123"

    def test_invalid_val_id_changes_nothing(self, browser, gateway, donation):
        validated(gateway, {"status": "INVALID_TRANSACTION"})
        assert post(browser, "ipn", {"tran_id": donation.gateway_ref, "val_id": "FAKE"}).status_code == 200
        donation.refresh_from_db()
        assert donation.status == Status.PENDING

    @pytest.mark.parametrize(
        ("override", "reason"),
        [({"amount": "1.00"}, "amount"), ({"currency": "USD"}, "currency"), ({"currency_type": "USD"}, "currency")],
    )
    def test_mismatch_is_recorded_not_paid(self, browser, gateway, donation, override, reason):
        validated(gateway, validation_answer(donation, **override))
        post(browser, "ipn", {"tran_id": donation.gateway_ref, "val_id": "VAL123"})
        donation.refresh_from_db()
        assert donation.status == Status.PENDING
        assert GatewayEvent.objects.get(kind="mismatch").status == reason

    def test_validated_tran_id_must_be_ours(self, browser, gateway, donation, api, valid_body):
        init_ok(gateway)
        other = Donation.objects.get(pk=api.post("/api/v1/donations/", valid_body, format="json").json()["id"])
        # A val_id for another (cheaper) payment posted with this donation's tran_id pays only that other one.
        validated(gateway, validation_answer(other))
        post(browser, "ipn", {"tran_id": donation.gateway_ref, "val_id": "VAL-OTHER"})
        donation.refresh_from_db()
        other.refresh_from_db()
        assert donation.status == Status.PENDING and other.status == Status.PAID

    def test_unknown_tran_id_is_stored_and_answered(self, browser, gateway):
        validated(gateway, {"status": "VALID", "tran_id": "NSDUNKNOWN", "amount": "10.00", "currency": "BDT"})
        assert post(browser, "ipn", {"tran_id": "NSDUNKNOWN", "val_id": "V"}).status_code == 200
        assert GatewayEvent.objects.filter(kind="ipn", donation=None).exists()

    def test_repeated_ipn_gives_one_receipt(self, browser, gateway, donation):
        validated(gateway, validation_answer(donation, status="VALIDATED"))
        for _ in range(3):
            post(browser, "ipn", {"tran_id": donation.gateway_ref, "val_id": "VAL123"})
        donation.refresh_from_db()
        assert donation.status == Status.PAID and donation.receipt_no.endswith("000001")
        assert Donation.objects.filter(status=Status.PAID).count() == 1

    def test_ipn_after_browser_success_changes_nothing(self, browser, gateway, donation):
        validated(gateway, validation_answer(donation))
        post(browser, "success", {"tran_id": donation.gateway_ref, "val_id": "VAL123"})
        donation.refresh_from_db()
        receipt = donation.receipt_no
        post(browser, "ipn", {"tran_id": donation.gateway_ref, "val_id": "VAL123"})
        donation.refresh_from_db()
        assert donation.receipt_no == receipt

    def test_validation_timeout_asks_sslcommerz_to_retry(self, browser, gateway, donation):
        gateway.get(VALIDATE_URL, body=requests.Timeout())
        assert post(browser, "ipn", {"tran_id": donation.gateway_ref, "val_id": "VAL123"}).status_code == 503
        donation.refresh_from_db()
        assert donation.status == Status.PENDING

    def test_answer_that_is_not_an_object_is_no_answer(self, browser, gateway, donation):
        gateway.get(VALIDATE_URL, json="Invalid request")
        assert post(browser, "ipn", {"tran_id": donation.gateway_ref, "val_id": "VAL123"}).status_code == 503
        r = post(browser, "success", {"tran_id": donation.gateway_ref, "val_id": "VAL123"})
        assert r.status_code == 303 and r["Location"].endswith(f"/en/donate/success?id={donation.pk}")

    def test_paid_confirmation_for_a_cancelled_donation_raises_an_alert(self, browser, gateway, donation):
        Donation.objects.filter(pk=donation.pk).update(status=Status.CANCELLED)
        validated(gateway, validation_answer(donation))
        post(browser, "ipn", {"tran_id": donation.gateway_ref, "val_id": "VAL123"})
        donation.refresh_from_db()
        assert donation.status == Status.CANCELLED
        assert GatewayEvent.objects.get(kind="alert").status == "paid_while_cancelled"


class TestBrowserReturns:
    def test_success_redirects_with_language_prefix(self, browser, gateway, donation):
        validated(gateway, validation_answer(donation))
        r = post(browser, "success", {"tran_id": donation.gateway_ref, "val_id": "VAL123"})
        assert r.status_code == 303
        assert r["Location"] == f"http://testserver/en/donate/success?id={donation.pk}"
        donation.refresh_from_db()
        assert donation.status == Status.PAID

    def test_success_post_alone_never_marks_paid(self, browser, gateway, donation):
        validated(gateway, {"status": "INVALID_TRANSACTION"})
        r = post(
            browser, "success", {"tran_id": donation.gateway_ref, "val_id": "X", "status": "VALID", "amount": "500.00"}
        )
        assert r.status_code == 303
        donation.refresh_from_db()
        assert donation.status == Status.PENDING

    def test_fail_when_gateway_agrees(self, browser, gateway, donation):
        gateway.get(
            QUERY_URL, json={"APIConnect": "DONE", "element": [{"status": "FAILED", "tran_id": donation.gateway_ref}]}
        )
        r = post(browser, "fail", {"tran_id": donation.gateway_ref, "status": "FAILED"})
        assert r.status_code == 303 and r["Location"].endswith(f"/en/donate/failed?id={donation.pk}")
        donation.refresh_from_db()
        assert (donation.status, donation.fail_reason) == (Status.FAILED, "declined")

    def test_cancel_when_gateway_agrees(self, browser, gateway, donation):
        gateway.get(QUERY_URL, json={"APIConnect": "DONE", "element": [{"status": "CANCELLED"}]})
        post(browser, "cancel", {"tran_id": donation.gateway_ref})
        donation.refresh_from_db()
        assert donation.status == Status.CANCELLED

    def test_fail_post_for_a_paid_transaction_marks_paid_instead(self, browser, gateway, donation):
        gateway.get(QUERY_URL, json={"APIConnect": "DONE", "element": [validation_answer(donation)]})
        post(browser, "fail", {"tran_id": donation.gateway_ref})
        donation.refresh_from_db()
        assert donation.status == Status.PAID

    def test_a_declined_card_while_another_attempt_is_running_stays_pending(self, browser, gateway, donation):
        gateway.get(QUERY_URL, json={"APIConnect": "DONE", "element": [{"status": "FAILED"}, {"status": "PENDING"}]})
        post(browser, "fail", {"tran_id": donation.gateway_ref})
        donation.refresh_from_db()
        assert donation.status == Status.PENDING

    def test_gateway_still_pending_leaves_pending(self, browser, gateway, donation):
        gateway.get(QUERY_URL, json={"APIConnect": "DONE", "element": [{"status": "PENDING"}]})
        post(browser, "cancel", {"tran_id": donation.gateway_ref})
        donation.refresh_from_db()
        assert donation.status == Status.PENDING

    def test_unknown_tran_id_goes_to_the_funds_list(self, browser):
        r = post(browser, "fail", {"tran_id": "NSDNOPE"})
        assert r.status_code == 303 and r["Location"] == "http://testserver/bn/donate"

    def test_get_is_not_allowed(self, browser):
        assert browser.get("/api/v1/payments/sslcommerz/success/").status_code == 405
