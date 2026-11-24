"""Money totals for the public /transparency page (API.md "GET /transparency/totals/")."""

from collections import defaultdict
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import Sum
from django.db.models.functions import ExtractYear

from content.models import Fund
from core.utils import translated

from .models import Donation, OfflineTotal, Status


def yearly_totals(lang):
    """PAID donations by year (Asia/Dhaka) and fund, plus the offline totals staff entered, newest year first.
    In each year non-zakat funds come first and zakat funds after them, so the page can show zakat separately."""
    by_year = defaultdict(lambda: defaultdict(int))  # year → fund id → taka
    paid = (
        Donation.objects.filter(status=Status.PAID, paid_at__isnull=False)
        .annotate(year=ExtractYear("paid_at", tzinfo=ZoneInfo(settings.TIME_ZONE)))
        .values("year", "fund_id")
        .annotate(total=Sum("amount"))
    )
    for row in paid:
        by_year[row["year"]][row["fund_id"]] += row["total"]
    for row in OfflineTotal.objects.values("year", "fund_id", "total"):
        by_year[row["year"]][row["fund_id"]] += row["total"]

    funds = Fund.objects.in_bulk({fund_id for totals in by_year.values() for fund_id in totals})
    years = []
    for year in sorted(by_year, reverse=True):
        rows = [
            {
                "slug": funds[fund_id].slug,
                "title": translated(funds[fund_id], "title", lang),
                "total": total,
                "is_zakat": funds[fund_id].is_zakat_eligible,
            }
            for fund_id, total in by_year[year].items()
        ]
        order = {f.slug: (f.is_zakat_eligible, f.sort_order) for f in funds.values()}
        rows.sort(key=lambda r: order[r["slug"]])
        years.append({"year": year, "funds": rows, "total": sum(r["total"] for r in rows)})
    return years
