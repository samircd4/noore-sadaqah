"""cleanup_pending (DONATION_FLOW.md rule 5): donations still PENDING after 24 hours are settled with SSLCommerz."""

from datetime import timedelta

import pytest
from django.utils import timezone
from requests.exceptions import ConnectionError as NetworkDown

from content.models import Fund
from donations.models import Donation, Status
from payments.models import GatewayEvent
from payments.tasks import cleanup_pending

from .conftest import QUERY_URL, validation_answer

pytestmark = pytest.mark.usefixtures("seeded")


def donation(hours_old=25, **extra):
    d = Donation.objects.create(
        amount=500, fund=Fund.objects.get(slug="sadaqah"), donor_name="X", donor_phone="01712345678",
        method="sslcommerz", **extra,
    )  # fmt: skip
    Donation.objects.filter(pk=d.pk).update(created_at=timezone.now() - timedelta(hours=hours_old))
    return d


def status_of(d):
    d.refresh_from_db()
    return d.status, d.fail_reason


class TestCleanupPending:
    def test_paid_at_the_gateway_becomes_paid(self, gateway):
        d = donation()
        gateway.get(QUERY_URL, json={"APIConnect": "DONE", "element": [validation_answer(d)]})
        assert cleanup_pending() == 1
        d.refresh_from_db()
        assert d.status == Status.PAID and d.receipt_no
        assert GatewayEvent.objects.filter(donation=d, kind="cleanup_query").count() == 1

    @pytest.mark.parametrize(
        ("elements", "reason"),
        [
            ([], "expired"),  # SSLCommerz has no record: the donor never reached the payment page
            ([{"status": "PENDING"}], "expired"),
            ([{"status": "UNATTEMPTED"}], "expired"),
            ([{"status": "FAILED"}, {"status": "PENDING"}], "declined"),  # a card was declined, nothing else paid
        ],
    )
    def test_nothing_paid_after_a_day_becomes_failed(self, gateway, elements, reason):
        d = donation()
        gateway.get(QUERY_URL, json={"APIConnect": "DONE", "element": elements})
        cleanup_pending()
        assert status_of(d) == (Status.FAILED, reason)

    def test_cancelled_at_the_gateway_becomes_cancelled(self, gateway):
        d = donation()
        gateway.get(QUERY_URL, json={"APIConnect": "DONE", "element": [{"status": "CANCELLED"}]})
        cleanup_pending()
        assert status_of(d) == (Status.CANCELLED, "cancelled")

    def test_gateway_unreachable_stays_pending_for_next_night(self, gateway):
        d = donation()
        gateway.get(QUERY_URL, body=NetworkDown())
        assert cleanup_pending() == 0
        assert status_of(d) == (Status.PENDING, "")

    def test_recent_and_settled_donations_are_not_asked(self, gateway):
        recent = donation(hours_old=23)
        paid_long_ago = donation(status=Status.FAILED, fail_reason="declined")
        assert cleanup_pending() == 0
        assert not GatewayEvent.objects.exists()
        assert status_of(recent) == (Status.PENDING, "")
        assert status_of(paid_long_ago) == (Status.FAILED, "declined")

    def test_monthly_donations_are_left_alone(self, gateway):
        monthly = donation(hours_old=48, kind="monthly")  # a REMINDER month stays PENDING for 7 days
        assert cleanup_pending() == 0
        assert not GatewayEvent.objects.exists()
        assert status_of(monthly) == (Status.PENDING, "")

    def test_running_twice_asks_once(self, gateway):
        d = donation()
        gateway.get(QUERY_URL, json={"APIConnect": "DONE", "element": []})
        cleanup_pending()
        cleanup_pending()
        assert GatewayEvent.objects.filter(donation=d).count() == 1
