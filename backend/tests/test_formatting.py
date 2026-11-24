"""Numbers, money and dates as donors see them (I18N.md; matches frontend/src/lib/format.js)."""

from datetime import UTC, datetime

import pytest

from core.utils import bn_date, bn_number, taka


@pytest.mark.parametrize(
    ("value", "bn", "en"),
    [
        (0, "০", "0"),
        (500, "৫০০", "500"),
        (1500, "১,৫০০", "1,500"),
        (100_000, "১,০০,০০০", "100,000"),
        (12_500_000, "১,২৫,০০,০০০", "12,500,000"),
    ],
)
def test_bn_number(value, bn, en):
    assert bn_number(value) == bn
    assert bn_number(value, "en") == en


def test_taka():
    assert taka(1000) == "৳১,০০০"
    assert taka(1000, "en") == "৳1,000"


def test_date_is_the_day_in_dhaka():
    late_utc = datetime(2026, 11, 23, 20, 0, tzinfo=UTC)  # already 24 November in Dhaka (UTC+6)
    assert bn_date(late_utc) == "২৪ নভেম্বর ২০২৬"
    assert bn_date(late_utc, "en") == "24 November 2026"
