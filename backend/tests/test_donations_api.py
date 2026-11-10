"""POST /donations/, GET status/, POST refresh/ (API.md "Donations").
Response shapes match frontend/src/mocks/routes/donations.js."""

from datetime import timedelta
from urllib.parse import parse_qs

import pytest
import requests
import responses
from django.core.cache import cache
from django.utils import timezone

from donations.models import Donation, Status
from donations.services import mark_paid
from payments.models import GatewayEvent

from .conftest import INIT_URL, QUERY_URL, init_ok, validation_answer

pytestmark = pytest.mark.usefixtures("seeded")

STATUS_KEYS = {"id", "status", "amount", "fund", "kind", "receipt_no", "paid_at", "fail_reason"}


def create(api, body, **headers):
    return api.post("/api/v1/donations/", body, format="json", **headers)


class TestCreate:
    def test_creates_pending_and_returns_gateway_url(self, api, gateway, valid_body):
        init_ok(gateway)
        r = create(api, {**valid_body, "donor_phone": "+880 ১৭১২-৩৪৫৬৭৮", "amount": "১,০০০"})
        assert r.status_code == 201
        assert set(r.json()) == {"id", "redirect_url", "expires_at"}
        assert r.json()["redirect_url"].startswith("https://sandbox.sslcommerz.com/")
        d = Donation.objects.get(pk=r.json()["id"])
        assert (d.status, d.amount, d.donor_phone, d.gateway_session) == (
            Status.PENDING,
            1000,
            "01712345678",
            "SESS123",
        )

        sent = parse_qs(gateway.calls[0].request.body)
        assert sent["tran_id"] == [d.gateway_ref]
        assert sent["total_amount"] == ["1000"] and sent["currency"] == ["BDT"]
        assert sent["cus_email"] == ["donations@nooresadaqah.org"]  # donor gave no email
        assert sent["ipn_url"] == ["http://testserver/api/v1/payments/sslcommerz/ipn/"]
        event = GatewayEvent.objects.get(kind="create")
        assert event.donation == d and event.status == "SUCCESS"

    def test_field_errors_use_message_keys(self, api, valid_body):
        r = create(api, {**valid_body, "donor_phone": "12345", "method": "", "donor_name": ""})
        assert r.status_code == 400
        assert r.json() == {
            "error": {
                "code": "validation",
                "fields": {"donor_phone": ["mobileInvalid"], "method": ["required"], "donor_name": ["required"]},
            }
        }

    @pytest.mark.parametrize(
        ("change", "field", "error"),
        [
            ({"amount": 5}, "amount", {"code": "minAmount", "min": 10}),
            ({"amount": 10_000_001}, "amount", {"code": "maxAmount", "max": 10_000_000}),
            ({"amount": "abc"}, "amount", "amountInvalid"),
            ({"method": "paypal"}, "method", "choiceInvalid"),
            ({"method": "bkash"}, "method", "choiceInvalid"),  # until the bKash client exists
            ({"fund": "nope"}, "fund", "fundInactive"),
            ({"fund": "fitra"}, "fund", "fitraClosed"),
            ({"kind": "monthly"}, "kind", "recurringNotAllowed"),  # until B4
            ({"on_behalf_of": "Mother"}, "on_behalf_permission", "onBehalfPermission"),
            ({"campaign": "orphan-smile"}, "campaign", "choiceInvalid"),  # another fund's campaign
            ({"campaign": "winter-blanket-2025"}, "campaign", "campaignEnded"),
            ({"donor_email": "not-an-email"}, "donor_email", "emailInvalid"),
            ({"donor_name": "x" * 121}, "donor_name", "tooLong"),
        ],
    )
    def test_refusals(self, api, valid_body, change, field, error):
        r = create(api, {**valid_body, **change})
        assert r.status_code == 400, r.json()
        assert r.json()["error"]["fields"][field] == [error]
        assert not Donation.objects.exists()

    def test_campaign_of_the_same_fund_is_kept(self, api, gateway, valid_body):
        init_ok(gateway)
        r = create(api, {**valid_body, "fund": "orphan", "campaign": "orphan-smile"})
        assert r.status_code == 201
        assert Donation.objects.get().campaign.slug == "orphan-smile"

    def test_throttles_the_11th_request_per_ip(self, api, valid_body):
        bad = {**valid_body, "amount": 1}  # refused before any gateway call; still counted
        for _ in range(10):
            assert create(api, bad, HTTP_X_FORWARDED_FOR="203.0.113.5").status_code == 400
        r = create(api, bad, HTTP_X_FORWARDED_FOR="203.0.113.5")
        assert r.status_code == 429
        assert r.json()["error"]["code"] == "throttled" and r.json()["error"]["retry_after"] > 0
        # Another visitor behind the same Next.js server is not affected.
        assert create(api, bad, HTTP_X_FORWARDED_FOR="203.0.113.6").status_code == 400

    def test_forwarded_ip_is_ignored_from_untrusted_peers(self, valid_body):
        from rest_framework.test import APIClient

        outsider = APIClient(REMOTE_ADDR="198.51.100.7")
        bad = {**valid_body, "amount": 1}
        for n in range(10):
            outsider.post("/api/v1/donations/", bad, format="json", HTTP_X_FORWARDED_FOR=f"10.0.0.{n}")
        assert outsider.post("/api/v1/donations/", bad, format="json").status_code == 429

    def test_gateway_timeout_is_502_and_donation_stays_pending(self, api, gateway, valid_body):
        gateway.post(INIT_URL, body=requests.Timeout())
        r = create(api, valid_body)
        assert r.status_code == 502 and r.json() == {"error": {"code": "gatewayUnavailable"}}
        assert Donation.objects.get().status == Status.PENDING
        assert GatewayEvent.objects.get(kind="create").status == "NO_ANSWER"

    def test_gateway_refusal_is_502(self, api, gateway, valid_body):
        gateway.post(INIT_URL, json={"status": "FAILED", "failedreason": "Store Credential Error"})
        assert create(api, valid_body).status_code == 502


def paid_donation(api, gateway, valid_body):
    init_ok(gateway)
    d = Donation.objects.get(pk=create(api, valid_body).json()["id"])
    mark_paid(d.pk, txn_id="BANK1", payload={})
    return d


class TestStatus:
    def test_pending_shape_has_no_personal_data(self, api, gateway, valid_body):
        init_ok(gateway)
        donation_id = create(api, valid_body).json()["id"]
        body = api.get(f"/api/v1/donations/{donation_id}/status/").json()
        assert set(body) == STATUS_KEYS
        assert body["status"] == "pending" and body["fund"] == {"slug": "sadaqah", "title": "সাদাকাহ"}
        assert "Test Donor" not in str(body) and "01712345678" not in str(body)

    def test_paid_has_receipt_and_english_title(self, api, gateway, valid_body):
        d = paid_donation(api, gateway, valid_body)
        body = api.get(f"/api/v1/donations/{d.pk}/status/", HTTP_ACCEPT_LANGUAGE="en").json()
        assert set(body) == STATUS_KEYS | {"receipt_url"}
        assert body["fund"]["title"] == "Sadaqah"
        assert body["receipt_no"].startswith("NSF-") and body["paid_at"].endswith("Z")
        assert body["receipt_url"].startswith(f"/r/{d.gateway_ref}-")

    def test_failed_shows_a_localized_reason(self, api, gateway, valid_body):
        init_ok(gateway)
        d = Donation.objects.get(pk=create(api, valid_body).json()["id"])
        Donation.objects.filter(pk=d.pk).update(status=Status.FAILED, fail_reason="declined")
        assert api.get(f"/api/v1/donations/{d.pk}/status/").json()["fail_reason"] == "পেমেন্ট সম্পন্ন হয়নি।"

    def test_unknown_id_is_404(self, api):
        r = api.get("/api/v1/donations/6f1c0b7e-0000-4000-8000-000000000000/status/")
        assert r.status_code == 404 and r.json() == {"error": {"code": "notFound"}}


class TestRefresh:
    def test_young_pending_donation_does_not_query(self, api, gateway, valid_body):
        init_ok(gateway)
        donation_id = create(api, valid_body).json()["id"]
        assert api.post(f"/api/v1/donations/{donation_id}/refresh/").json()["status"] == "pending"
        assert len(gateway.calls) == 1  # only the initiate call

    def test_after_two_minutes_asks_the_gateway_once(self, api, gateway, valid_body):
        init_ok(gateway)
        d = Donation.objects.get(pk=create(api, valid_body).json()["id"])
        Donation.objects.filter(pk=d.pk).update(created_at=timezone.now() - timedelta(minutes=3))
        gateway.get(QUERY_URL, json={"APIConnect": "DONE", "no_of_trans_found": 1, "element": [validation_answer(d)]})
        body = api.post(f"/api/v1/donations/{d.pk}/refresh/").json()
        assert body["status"] == "paid"
        assert GatewayEvent.objects.filter(kind="refresh_query").count() == 1

    def test_queries_only_once_while_still_pending(self, api, gateway, valid_body):
        init_ok(gateway)
        d = Donation.objects.get(pk=create(api, valid_body).json()["id"])
        Donation.objects.filter(pk=d.pk).update(created_at=timezone.now() - timedelta(minutes=3))
        gateway.get(QUERY_URL, json={"APIConnect": "DONE", "no_of_trans_found": 0, "element": []})
        for _ in range(3):
            assert api.post(f"/api/v1/donations/{d.pk}/refresh/").json()["status"] == "pending"
        assert GatewayEvent.objects.filter(kind="refresh_query").count() == 1

    def test_a_query_without_answer_is_tried_again(self, api, gateway, valid_body):
        init_ok(gateway)
        d = Donation.objects.get(pk=create(api, valid_body).json()["id"])
        Donation.objects.filter(pk=d.pk).update(created_at=timezone.now() - timedelta(minutes=3))
        gateway.get(QUERY_URL, body=requests.Timeout())
        assert api.post(f"/api/v1/donations/{d.pk}/refresh/").json()["status"] == "pending"
        cache.clear()  # the 30-second lock between two queries has passed
        answer = {"APIConnect": "DONE", "no_of_trans_found": 1, "element": [validation_answer(d)]}
        gateway.replace(responses.GET, QUERY_URL, json=answer)
        assert api.post(f"/api/v1/donations/{d.pk}/refresh/").json()["status"] == "paid"


def test_start_payment_survives_a_null_session_key(api, gateway, valid_body):
    page = "https://sandbox.sslcommerz.com/x"
    gateway.post(INIT_URL, json={"status": "SUCCESS", "sessionkey": None, "GatewayPageURL": page})
    assert create(api, valid_body).status_code == 201
