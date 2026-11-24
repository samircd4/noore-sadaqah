"""
The admin home page (ADMIN.md "Dashboard"), filled in by Unfold's DASHBOARD_CALLBACK.

Money counts only PAID donations, by day in Asia/Dhaka. Zakat is always shown on its own and never added into the
general totals (ZAKAT_POLICY). What a staff member sees follows their permissions (core/groups.py): Editors get the
totals and the content to-dos, never donor names.
"""

import json
from datetime import timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.urls import reverse
from django.utils import timezone

from content.models import Campaign, Fund, Post, Program
from content.output import campaign_totals
from donations.models import Donation, Status
from engagement.models import ContactMessage, Volunteer

from .models import SiteSettings
from .utils import bn_number, taka

DHAKA = ZoneInfo(settings.TIME_ZONE)
PLACEHOLDER_MARKS = ("নমুনা", "sample", "todo")
CHART_DAYS = 30


def dashboard(request, context):
    """Unfold calls this for /admin/ and renders templates/admin/index.html with the result."""
    user = request.user
    can = {
        "money": user.has_perm("donations.view_donation") or user.has_perm("content.view_fund"),
        "donations": user.has_perm("donations.view_donation"),
        "messages": user.has_perm("engagement.view_contactmessage"),
        "volunteers": user.has_perm("engagement.view_volunteer"),
        "posts": user.has_perm("content.view_post"),
        "programs": user.has_perm("content.view_program"),
        "settings": user.has_perm("core.view_sitesettings"),
        "campaigns": user.has_perm("content.view_campaign"),
    }
    key = "admin_dashboard:" + "".join("1" if allowed else "0" for allowed in can.values())
    data = cache.get(key)
    if data is None:
        data = build(can)
        cache.set(key, data, 60)
    # full width: no empty margins beside the cards on wide screens or with the sidebar folded
    context.update({"dashboard": data, "title": "ড্যাশবোর্ড (Dashboard)", "is_fullwidth": "1"})
    return context


def build(can):
    now = timezone.localtime(timezone.now(), DHAKA)
    data = {"updated": now.strftime("%H:%M")}
    if can["money"]:
        data.update(money(now))
    data["attention"] = attention(can, now)
    if can["donations"]:
        data["latest"] = latest_donations()
    if can["campaigns"]:
        data["campaigns"] = campaign_progress()
    return data


# ---- money ------------------------------------------------------------------------------------------------------


def day_start(moment):
    return moment.replace(hour=0, minute=0, second=0, microsecond=0)


def totals(queryset):
    result = queryset.aggregate(total=Sum("amount"), count=Count("pk"))
    return result["total"] or 0, result["count"]


def money(now):
    paid = Donation.objects.filter(status=Status.PAID)
    general, zakat = paid.filter(fund__is_zakat_eligible=False), paid.filter(fund__is_zakat_eligible=True)

    today = day_start(now)
    month = today.replace(day=1)
    last_month = (month - timedelta(days=1)).replace(day=1)
    year = month.replace(month=1)

    today_total, today_count = totals(general.filter(paid_at__gte=today))
    month_total, month_count = totals(general.filter(paid_at__gte=month))
    # Last month up to the same day, so the comparison is fair in the middle of a month.
    same_point = last_month + (now - month)
    last_total, _ = totals(general.filter(paid_at__gte=last_month, paid_at__lt=min(same_point, month)))
    year_total, year_count = totals(general.filter(paid_at__gte=year))
    zakat_total, zakat_count = totals(zakat.filter(paid_at__gte=year))

    change = None
    if last_total:
        change = round((month_total - last_total) * 100 / last_total)

    paid_link = reverse("admin:donations_donation_changelist") + "?status__exact=paid"
    cards = [
        {
            "title": "আজ (Today)",
            "value": taka(today_total),
            "note": f"{bn_number(today_count)}টি দান",
            "link": paid_link,
        },
        {
            "title": "এই মাস (This month)",
            "value": taka(month_total),
            "note": f"{bn_number(month_count)}টি দান",
            "change": change,
            "link": paid_link,
        },
        {
            "title": f"{now.year} সাল (This year)",
            "value": taka(year_total),
            "note": f"{bn_number(year_count)}টি দান",
            "link": paid_link,
        },  # fmt: skip
        {
            "title": "যাকাত, এ বছর (Zakat)",
            "value": taka(zakat_total),
            "note": f"{bn_number(zakat_count)}টি দান · আলাদা হিসাব",
            "link": paid_link,
            "zakat": True,
        },  # fmt: skip
    ]
    return {"cards": cards, "chart": chart(paid, today), "funds": by_fund(paid, year)}


def chart(paid, today):
    """PAID taka per Dhaka day for the last 30 days: general funds and zakat as two bars."""
    start = today - timedelta(days=CHART_DAYS - 1)
    rows = (
        paid.filter(paid_at__gte=start)
        .annotate(day=TruncDate("paid_at", tzinfo=DHAKA))
        .values("day", "fund__is_zakat_eligible")
        .annotate(total=Sum("amount"))
    )
    general, zakat = {}, {}
    for row in rows:
        (zakat if row["fund__is_zakat_eligible"] else general)[row["day"]] = row["total"]
    days = [(start + timedelta(days=i)).date() for i in range(CHART_DAYS)]
    return json.dumps(
        {
            "labels": [f"{d.day}/{d.month}" for d in days],
            "datasets": [
                {
                    "label": "General",
                    "data": [general.get(d, 0) for d in days],
                    "backgroundColor": "var(--color-primary-600)",
                },
                {
                    "label": "Zakat",
                    "data": [zakat.get(d, 0) for d in days],
                    "backgroundColor": "var(--color-primary-300)",
                },
            ],
        }  # fmt: skip
    )


def by_fund(paid, year):
    """This year's totals per fund; zakat funds after the others."""
    totals_by_fund = {
        row["fund"]: row
        for row in paid.filter(paid_at__gte=year).values("fund").annotate(total=Sum("amount"), count=Count("pk"))
    }
    funds = sorted(Fund.objects.all(), key=lambda f: (f.is_zakat_eligible, f.sort_order))
    # Shares never mix zakat with the general funds: each part is 100% of its own total.
    part_total = {
        zakat: sum(totals_by_fund.get(f.pk, {"total": 0})["total"] for f in funds if f.is_zakat_eligible == zakat) or 1
        for zakat in (False, True)
    }
    rows = []
    for fund in funds:
        row = totals_by_fund.get(fund.pk, {"total": 0, "count": 0})
        rows.append(
            [
                fund.title_bn + (" · যাকাত" if fund.is_zakat_eligible else ""),
                bn_number(row["count"]),
                taka(row["total"]),
                f"{bn_number(round(row['total'] * 100 / part_total[fund.is_zakat_eligible]))}%",
            ]
        )
    return {"headers": ["তহবিল (Fund)", "দান (Count)", "টাকা (Taka)", "অংশ (Share)"], "rows": rows}


# ---- to-dos -----------------------------------------------------------------------------------------------------


def attention(can, now):
    """Things someone should look at, with a link to the list that shows them. Zero counts are left out."""
    items = []

    def add(allowed, count, title, url, icon):
        if allowed and count:
            items.append({"title": title, "count": bn_number(count), "link": url, "icon": icon})

    changelist = lambda model: reverse(f"admin:{model}_changelist")  # noqa: E731
    stuck = Donation.objects.filter(status=Status.PENDING, created_at__lt=now - timedelta(hours=1)).count()
    add(can["donations"], stuck, "১ ঘণ্টার বেশি পেন্ডিং দান (Pending > 1 hour)",
        changelist("donations_donation") + "?status__exact=pending", "hourglass_top")  # fmt: skip
    add(can["messages"], ContactMessage.objects.filter(handled=False).count(), "উত্তর না দেওয়া বার্তা (Unhandled messages)",
        changelist("engagement_contactmessage") + "?handled__exact=0", "chat")  # fmt: skip
    add(can["volunteers"], Volunteer.objects.filter(handled=False).count(), "নতুন স্বেচ্ছাসেবক (New volunteers)",
        changelist("engagement_volunteer") + "?handled__exact=0", "diversity_3")  # fmt: skip
    add(can["posts"], Post.objects.filter(published_at__isnull=True).count(), "খসড়া সংবাদ (Draft posts)",
        changelist("content_post") + "?published_at__isempty=1", "edit_note")  # fmt: skip
    missing_english = (
        Program.objects.filter(is_active=True, title_en="").count()
        + Post.objects.filter(title_en="").count()
        + Fund.objects.filter(is_active=True, title_en="").count()
    )
    add(
        can["programs"],
        missing_english,
        "ইংরেজি অনুবাদ নেই (Missing English)",
        changelist("content_program"),
        "translate",
    )
    add(can["settings"], len(placeholder_settings()), "নমুনা তথ্য এখনো আছে (Sample facts still live)",
        changelist("core_sitesettings"), "warning")  # fmt: skip
    return items


def placeholder_settings():
    """Settings fields that still hold sample text (CONTENT.md: TODO items must not go live)."""
    site = SiteSettings.load()
    fields = ("address_bn", "address_en", "hours_bn", "hours_en", "reg_authority_bn", "reg_authority_en", "reg_number")
    return [name for name in fields if any(mark in (getattr(site, name) or "").lower() for mark in PLACEHOLDER_MARKS)]


# ---- lists ------------------------------------------------------------------------------------------------------

STATUS_LABEL = {"paid": "সফল", "pending": "অপেক্ষমাণ", "failed": "ব্যর্থ", "cancelled": "বাতিল", "refunded": "ফেরত"}


def latest_donations():
    rows = []
    donations = Donation.objects.select_related("fund").order_by("-created_at")[:10]
    for d in donations:
        moment = timezone.localtime(d.paid_at or d.created_at, DHAKA)
        rows.append(
            {
                "link": reverse("admin:donations_donation_change", args=[d.pk]),
                "receipt": d.receipt_no or d.gateway_ref,
                "when": moment.strftime("%d/%m %H:%M"),
                "donor": d.donor_name,
                "fund": d.fund.title_bn,
                "amount": taka(d.amount),
                "status": d.status,
                "status_label": STATUS_LABEL.get(d.status, d.status),
            }
        )
    return rows


def campaign_progress():
    """Every active campaign: running ones first, then the ones that have ended (marked), newest first."""
    now = timezone.now()
    rows = []
    for campaign in Campaign.objects.filter(is_active=True).select_related("fund").order_by("-starts_at"):
        raised = campaign_totals(campaign)["raised"]
        percent = min(100, round(raised * 100 / campaign.goal_amount)) if campaign.goal_amount else 0
        ended = campaign.has_ended(now)
        ends = timezone.localtime(campaign.ends_at, DHAKA).strftime("%d/%m/%Y") if campaign.ends_at else ""
        rows.append(
            {
                "title": campaign.title_bn,
                "link": reverse("admin:content_campaign_change", args=[campaign.pk]),
                "percent": percent,
                "label": f"{taka(raised)} / {taka(campaign.goal_amount)} · {bn_number(percent)}%",
                "ended": ended,
                "note": f"শেষ হয়েছে {ends} (Ended)" if ended else (f"শেষ হবে {ends}" if ends else "চলমান (Running)"),
            }
        )
    rows.sort(key=lambda row: row["ended"])  # stable: running first, each part still newest first
    return rows
