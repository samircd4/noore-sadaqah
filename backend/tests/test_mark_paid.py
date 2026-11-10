"""mark_paid() (TESTING.md "Must-have backend tests")."""

import threading
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from django.db import connection

from content.models import Fund
from donations.models import Donation, Status
from donations.services import CannotMarkPaid, mark_paid

DHAKA = ZoneInfo("Asia/Dhaka")


def make(**extra):
    fund = Fund.objects.get(slug="sadaqah")
    return Donation.objects.create(
        amount=500, fund=fund, donor_name="X", donor_phone="01712345678", method="sslcommerz", **extra
    )


@pytest.mark.usefixtures("seeded")
class TestMarkPaid:
    def test_pending_becomes_paid_once(self):
        d = make()
        paid, changed = mark_paid(d.pk, txn_id="T1", payload={"a": 1})
        assert changed and paid.status == Status.PAID and paid.receipt_no and paid.paid_at
        again, changed_again = mark_paid(d.pk, txn_id="T1", payload={})
        assert not changed_again and again.receipt_no == paid.receipt_no

    def test_failed_can_become_paid(self):
        d = make(status=Status.FAILED, fail_reason="declined")
        paid, changed = mark_paid(d.pk, txn_id="T2", payload={})
        assert changed and paid.status == Status.PAID and paid.fail_reason == ""

    @pytest.mark.parametrize("state", [Status.CANCELLED, Status.REFUNDED])
    def test_cancelled_or_refunded_raises(self, state):
        d = make(status=state)
        with pytest.raises(CannotMarkPaid):
            mark_paid(d.pk, txn_id="T3", payload={})
        d.refresh_from_db()
        assert d.status == state

    def test_receipt_numbers_count_per_dhaka_year(self):
        # 31 Dec 23:59 in Dhaka is still the old year; 1 Jan 00:00 starts the new one.
        a = mark_paid(make().pk, txn_id="A", payload={}, paid_at=datetime(2026, 12, 31, 23, 59, tzinfo=DHAKA))[0]
        b = mark_paid(make().pk, txn_id="B", payload={}, paid_at=datetime(2027, 1, 1, 0, 0, tzinfo=DHAKA))[0]
        c = mark_paid(make().pk, txn_id="C", payload={}, paid_at=datetime(2026, 12, 31, 18, 0, tzinfo=ZoneInfo("UTC")))[
            0
        ]
        assert a.receipt_no == "NSF-2026-000001"
        assert b.receipt_no == "NSF-2027-000001"
        assert c.receipt_no == "NSF-2027-000002"  # 18:00 UTC = 00:00 next day in Dhaka

    def test_fund_never_changes(self):
        d = make()
        d.fund = Fund.objects.get(slug="zakat")
        with pytest.raises(Exception, match="fund"):
            d.save()


@pytest.mark.django_db(transaction=True)
def test_parallel_payments_get_unique_gap_free_numbers(seeded):
    donations = [make() for _ in range(8)]
    errors = []

    def pay(pk, n):
        try:
            mark_paid(pk, txn_id=f"P{n}", payload={})
        except Exception as exc:  # pragma: no cover - reported below
            errors.append(exc)
        finally:
            connection.close()

    threads = [threading.Thread(target=pay, args=(d.pk, i)) for i, d in enumerate(donations)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errors
    numbers = sorted(Donation.objects.values_list("receipt_no", flat=True))
    year = numbers[0].split("-")[1]
    assert numbers == [f"NSF-{year}-{i:06d}" for i in range(1, 9)]
