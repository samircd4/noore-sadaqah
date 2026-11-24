"""Regression tests for the B1 code review (one per finding)."""

import secrets
from io import BytesIO
from unittest import mock

import pytest
from django.contrib import admin
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image

from accounts.models import User
from audit.models import AuditLog
from content.models import Fund, Post, Program
from engagement.models import Subscriber

pytestmark = pytest.mark.usefixtures("seeded")


def staff(client, group, email):
    user = User.objects.create_user(email=email, password=secrets.token_urlsafe(16), is_staff=True)
    user.groups.add(Group.objects.get(name=group))
    client.force_login(user)
    return user


@pytest.fixture
def superuser(client):
    user = User.objects.create_superuser(email="root@example.com", password=secrets.token_urlsafe(16))
    client.force_login(user)
    return user


# 1 ---------------------------------------------------------------------------------------------------------------
def test_new_user_password_never_reaches_the_audit_log(client, superuser):
    password = "Ab3-" + secrets.token_urlsafe(16)
    response = client.post(
        reverse("admin:accounts_user_add"),
        {"email": "new@example.com", "password1": password, "password2": password, "usable_password": "true"},
    )
    assert response.status_code == 302
    entry = AuditLog.objects.get(action="user.create")
    assert password not in str(entry.data)
    assert entry.data["after"]["password1"] == "changed"


# 2 ---------------------------------------------------------------------------------------------------------------
def test_admin_group_cannot_touch_a_superuser_or_the_groups(client):
    root = User.objects.create_superuser(email="dev@example.com", password=secrets.token_urlsafe(16))
    staff(client, "Admin", "boss@example.com")
    assert client.get(reverse("admin:auth_user_password_change", args=[root.pk])).status_code == 403
    assert client.post(reverse("admin:accounts_user_change", args=[root.pk]), {}).status_code == 403
    group = Group.objects.get(name="Admin")
    page = client.get(reverse("admin:auth_group_change", args=[group.pk])).content.decode()
    assert 'name="permissions"' not in page  # read only


# 3 ---------------------------------------------------------------------------------------------------------------
def test_phone_photo_is_turned_the_right_way_up():
    image = Image.new("RGB", (3000, 1000), "white")  # stored sideways, EXIF says "rotate 90°"
    exif = image.getexif()
    exif[0x0112] = 6
    buffer = BytesIO()
    image.save(buffer, format="JPEG", exif=exif.tobytes())
    fund = Fund.objects.get(slug="sadaqah")
    fund.cover_image = SimpleUploadedFile("phone.jpg", buffer.getvalue(), content_type="image/jpeg")
    fund.save()
    fund.refresh_from_db()
    assert (fund.cover_width, fund.cover_height) == (1000, 3000)  # portrait, as the phone showed it


# 4 ---------------------------------------------------------------------------------------------------------------
@pytest.mark.parametrize("value", ["²", "١", "-1", "abc"])
def test_odd_page_numbers_dont_crash(api, value):
    assert api.get("/api/v1/posts/", {"page": value}).status_code == 200
    assert api.get("/api/v1/reports/", {"year": value}).status_code == 200


# 5 + 7 -----------------------------------------------------------------------------------------------------------
def test_publish_now_revalidates_and_needs_change_permission(client, superuser, django_capture_on_commit_callbacks):
    draft = Post.objects.first()
    Post.objects.filter(pk=draft.pk).update(published_at=None)
    with mock.patch("core.tasks.revalidate.delay") as delay, django_capture_on_commit_callbacks(execute=True):
        client.post(reverse("admin:content_post_changelist"), {"action": "publish_now", "_selected_action": [draft.pk]})
    delay.assert_called_once_with(["posts"])
    assert Post.objects.get(pk=draft.pk).published_at is not None

    post_admin = admin.site._registry[Post]
    viewer = User.objects.create_user(email="viewer@example.com", is_staff=True)
    viewer.user_permissions.add(*Group.objects.get(name="Editor").permissions.filter(codename="view_post"))
    request = type("R", (), {"user": User.objects.get(pk=viewer.pk), "GET": {}, "POST": {}})()
    assert "publish_now" not in post_admin.get_actions(request)


# 6 ---------------------------------------------------------------------------------------------------------------
def test_double_subscribe_at_the_same_moment_gives_201(api):
    """The other request inserted the email between our lookup and our insert: Django re-reads it, no 500."""
    from django.db.models.query import QuerySet

    Subscriber.objects.create(email="race@example.com")
    real_get = QuerySet.get
    calls = []

    def first_lookup_misses(queryset, *args, **kwargs):
        calls.append(1)
        if len(calls) == 1:
            raise Subscriber.DoesNotExist
        return real_get(queryset, *args, **kwargs)

    with mock.patch.object(QuerySet, "get", autospec=True, side_effect=first_lookup_misses):
        response = api.post("/api/v1/subscribers/", {"email": "race@example.com"}, format="json")
    assert response.status_code == 201
    assert Subscriber.objects.filter(email="race@example.com").count() == 1


# 8 ---------------------------------------------------------------------------------------------------------------
def test_editor_cannot_move_a_program_to_another_fund(client):
    staff(client, "Editor", "editor@example.com")
    program = Program.objects.exclude(fund=None).first()
    page = client.get(reverse("admin:content_program_change", args=[program.pk])).content.decode()
    assert 'name="title_bn"' in page and 'name="fund"' not in page and 'name="slug"' not in page


# 9 ---------------------------------------------------------------------------------------------------------------
def test_dashboard_shares_keep_zakat_apart():
    from django.utils import timezone

    from core.dashboard import money
    from donations.models import Donation, Status

    for i, (slug, amount) in enumerate([("sadaqah", 3000), ("orphan", 3000), ("zakat", 4000)]):
        now = timezone.now()
        Donation.objects.create(
            fund=Fund.objects.get(slug=slug), amount=amount, donor_name="x", donor_phone="01712345678",
            method="sslcommerz", status=Status.PAID, paid_at=now, receipt_no=f"NSF-{now.year}-{i + 1:06d}",
        )  # fmt: skip
    rows = {row[0]: row[3] for row in money(timezone.localtime())["funds"]["rows"]}
    sadaqah = Fund.objects.get(slug="sadaqah").title_bn
    assert rows[sadaqah] == "৫০%"  # half of the general money, not 30% of everything
    assert next(share for name, share in rows.items() if "যাকাত" in name and share != "০%") == "১০০%"


# Client IP on a host without a local proxy (SnapDeploy) ------------------------------------------------------------
def test_forwarded_ip_trusted_only_with_the_proxy_secret(rf, settings):
    from core.utils import client_ip

    good = secrets.token_urlsafe(16)
    settings.API_PROXY_SECRET = good
    outside = {"REMOTE_ADDR": "10.0.0.9", "HTTP_X_FORWARDED_FOR": "203.0.113.7"}
    with_secret = lambda value: rf.get("/", **outside, **{"HTTP_X_PROXY_SECRET": value})  # noqa: E731
    assert client_ip(rf.get("/", **outside)) == "10.0.0.9"  # a visitor faking the header
    assert client_ip(with_secret("wrong")) == "10.0.0.9"
    assert client_ip(with_secret(good)) == "203.0.113.7"
    settings.API_PROXY_SECRET = ""
    assert client_ip(with_secret("")) == "10.0.0.9"  # off when unset
