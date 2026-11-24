"""The admin dashboard (ADMIN.md "Dashboard", core/dashboard.py)."""

import secrets
from datetime import timedelta

import pytest
from django.contrib.auth.models import Group
from django.urls import reverse
from django.utils import timezone

from accounts.models import User
from content.models import Fund, Post
from core.dashboard import build, money
from donations.models import Donation, Status
from engagement.models import ContactMessage

pytestmark = pytest.mark.usefixtures("seeded")

ALL = dict.fromkeys(
    ("money", "donations", "messages", "volunteers", "posts", "programs", "settings", "campaigns"), True
)


def donation(fund="sadaqah", amount=1000, status=Status.PAID, when=None, name="Karim Mia"):
    moment = when or timezone.now()
    number = Donation.objects.count() + 1
    paid = status == Status.PAID
    return Donation.objects.create(
        fund=Fund.objects.get(slug=fund), amount=amount, donor_name=name, donor_phone="01712345678",
        method="sslcommerz", status=status, paid_at=moment if paid else None,
        receipt_no=f"NSF-{moment.year}-{number:06d}" if paid else None,
    )  # fmt: skip


def now_dhaka():
    return timezone.localtime(timezone.now())


def test_today_counts_only_paid_general_donations():
    donation(amount=1000)
    donation(amount=500, status=Status.PENDING)
    donation(fund="zakat", amount=700)
    cards = money(now_dhaka())["cards"]
    assert cards[0]["value"] == "৳১,০০০"  # today: no pending, no zakat
    assert cards[3]["value"] == "৳৭০০" and "আলাদা" in cards[3]["note"]  # zakat on its own


def test_today_is_a_dhaka_day():
    start_of_today = now_dhaka().replace(hour=0, minute=0, second=0, microsecond=0)
    donation(amount=300, when=start_of_today - timedelta(minutes=1))  # yesterday in Dhaka
    assert money(now_dhaka())["cards"][0]["value"] == "৳০"


def test_by_fund_puts_zakat_last():
    donation(fund="zakat", amount=200)
    rows = money(now_dhaka())["funds"]["rows"]
    assert "যাকাত" in rows[-1][0] and rows[-1][2] == "৳২০০"


def test_attention_items_and_links():
    Donation.objects.filter(pk=donation(status=Status.PENDING).pk).update(
        created_at=timezone.now() - timedelta(hours=2)
    )
    ContactMessage.objects.create(name="x", contact="01712345678", subject="s", message="m")
    Post.objects.filter(pk=Post.objects.first().pk).update(published_at=None)
    items = {item["icon"]: item for item in build(ALL)["attention"]}
    assert items["hourglass_top"]["link"].endswith("?status__exact=pending")
    assert items["chat"]["count"] == "১"
    assert "edit_note" in items
    assert "diversity_3" not in items  # zero volunteers: hidden
    assert "warning" in items  # the fixtures still hold sample registration text


@pytest.mark.parametrize("group", ["Admin", "Accountant", "Editor"])
def test_page_renders_for_each_group(client, group):
    donation(name="Karim Mia")
    user = User.objects.create_user(email=f"{group}@example.com", password=secrets.token_urlsafe(16), is_staff=True)
    user.groups.add(Group.objects.get(name=group))
    client.force_login(user)
    page = client.get(reverse("admin:index")).content.decode()
    assert "ড্যাশবোর্ড (Dashboard)" in page and "আজ (Today)" in page
    if group == "Editor":  # totals only: no donor names, no pending card (ADMIN.md)
        assert "Karim Mia" not in page and "সর্বশেষ দান" not in page
    else:
        assert "Karim Mia" in page


def test_campaigns_include_ended_ones_after_running_ones():
    from content.models import Campaign

    rows = build(ALL)["campaigns"]
    assert len(rows) == Campaign.objects.filter(is_active=True).count() == 2
    assert [row["ended"] for row in rows] == [False, True]
    assert "Ended" in rows[1]["note"]


def test_sidebar_folds_into_an_icon_rail(client):
    from accounts.models import User

    user = User.objects.create_superuser(email="rail@example.com", password=secrets.token_urlsafe(16))
    client.force_login(user)
    page = client.get(reverse("admin:index")).content.decode()
    assert (
        "'ns-mini': wide &amp;&amp; !open()" in page or "'ns-mini': wide && !open()" in page
    )  # templates/admin/nav_sidebar.html, not Unfold's own wrapper
    assert "/dj-static/core/admin.js" in page  # tooltips for the rail icons
