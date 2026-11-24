"""Admin pages, staff groups and the audit log (docs/ADMIN.md)."""

import secrets

import pytest
from django.contrib import admin
from django.contrib.auth.models import Group
from django.urls import reverse

from accounts.models import User
from audit.models import AuditLog
from content.models import Fund, Page
from core.models import SiteSettings
from donations.models import Donation

pytestmark = pytest.mark.usefixtures("seeded")


def staff(group, email):
    user = User.objects.create_user(email=email, password=secrets.token_urlsafe(16), is_staff=True)
    user.groups.add(Group.objects.get(name=group))
    return user


@pytest.fixture
def superuser(client):
    user = User.objects.create_superuser(email="dev@example.com", password=secrets.token_urlsafe(16))
    client.force_login(user)
    return user


def test_every_admin_page_opens(client, superuser):
    """Each list and add page renders: catches a wrong field name in any ModelAdmin."""
    for model, model_admin in admin.site._registry.items():
        info = (model._meta.app_label, model._meta.model_name)
        assert client.get(reverse("admin:{}_{}_changelist".format(*info)), follow=True).status_code == 200, info
        if model_admin.has_add_permission(type("R", (), {"user": superuser})()):
            assert client.get(reverse("admin:{}_{}_add".format(*info))).status_code == 200, info


def test_every_change_page_opens(client, superuser):
    for model in (Fund, Page, SiteSettings):
        obj = model.objects.first() if model is not SiteSettings else SiteSettings.load()
        url = reverse(f"admin:{model._meta.app_label}_{model._meta.model_name}_change", args=[obj.pk])
        assert client.get(url).status_code == 200, model


def test_settings_list_opens_the_one_settings_page(client, superuser):
    response = client.get(reverse("admin:core_sitesettings_changelist"))
    assert response.status_code == 302 and response.url.endswith("/core/sitesettings/1/change/")


def test_groups_follow_the_permission_matrix():
    admin_group, editor, accountant = (Group.objects.get(name=n) for n in ("Admin", "Editor", "Accountant"))
    codes = lambda group: set(group.permissions.values_list("codename", flat=True))  # noqa: E731
    assert "change_sitesettings" in codes(admin_group) and "delete_donation" not in codes(admin_group)
    assert "delete_auditlog" not in codes(admin_group) and "change_auditlog" not in codes(admin_group)
    assert {"change_post", "change_fund"} <= codes(editor)
    assert not {"view_donation", "add_fund", "change_fundbankaccount", "view_auditlog"} & codes(editor)
    assert {"view_donation", "add_donation"} <= codes(accountant) and "change_post" not in codes(accountant)


def test_nobody_can_delete_a_donation(client, superuser):
    assert admin.site._registry[Donation].has_delete_permission(type("R", (), {"user": superuser})()) is False


class TestEditor:
    @pytest.fixture
    def editor(self, client):
        user = staff("Editor", "editor@example.com")
        client.force_login(user)
        return user

    def test_can_edit_fund_story_but_not_its_money_fields(self, client, editor):
        fund = Fund.objects.get(slug="zakat")
        url = reverse("admin:content_fund_change", args=[fund.pk])
        page = client.get(url).content.decode()
        assert 'name="title_bn"' in page and 'name="min_amount"' not in page and 'name="is_zakat_eligible"' not in page

    def test_settings_money_switches_are_read_only(self, client, editor):
        page = client.get(reverse("admin:core_sitesettings_change", args=[1])).content.decode()
        assert 'name="quote_text_bn"' in page
        assert 'name="pay_sslcommerz"' not in page and 'name="zakat_enabled"' not in page

    def test_policy_pages_are_admin_only(self, client, editor):
        privacy, about = Page.objects.get(slug="privacy"), Page.objects.get(slug="about")
        privacy_page = client.get(reverse("admin:content_page_change", args=[privacy.pk])).content.decode()
        assert 'name="body_bn"' not in privacy_page  # shown read only
        about_page = client.get(reverse("admin:content_page_change", args=[about.pk])).content.decode()
        assert 'name="body_bn"' in about_page

    def test_no_donations(self, client, editor):
        assert client.get(reverse("admin:donations_donation_changelist")).status_code == 403


def test_adding_an_offline_total_is_audited(client, superuser):
    fund = Fund.objects.get(slug="sadaqah")
    response = client.post(
        reverse("admin:donations_offlinetotal_add"), {"year": 2020, "fund": fund.pk, "total": 5000, "note": ""}
    )
    assert response.status_code == 302
    entry = AuditLog.objects.get(action="offlinetotal.create")
    assert entry.user == superuser and entry.data["after"]["total"] == 5000 and entry.target.startswith("donations.")


def test_settings_changes_log_only_the_changed_fields(rf, superuser):
    from django.forms import modelform_factory

    from core.admin import SiteSettingsAdmin

    site = SiteSettings.load()
    old_quote = site.quote_text_bn
    Form = modelform_factory(SiteSettings, fields=["quote_text_bn", "phone"])
    form = Form({"quote_text_bn": "নতুন উক্তি", "phone": site.phone}, instance=site)
    assert form.is_valid()
    request = rf.post("/admin/")
    request.user, request.META["REMOTE_ADDR"] = superuser, "127.0.0.1"
    SiteSettingsAdmin(SiteSettings, admin.site).save_model(request, form.save(commit=False), form, change=True)
    entry = AuditLog.objects.get(action="sitesettings.update")
    assert entry.data == {"before": {"quote_text_bn": old_quote}, "after": {"quote_text_bn": "নতুন উক্তি"}}


def test_passwords_never_reach_the_audit_log(rf, superuser):
    from audit.helpers import audit

    request = rf.post("/admin/")
    request.user = superuser
    entry = audit(request, "user.update", superuser, {"password": "old-hash"}, {"password": "new-hash"})
    assert "hash" not in str(entry.data)


def test_admin_branding_and_avatar(client, superuser):
    from io import BytesIO

    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (64, 64), "green").save(buffer, format="PNG")
    superuser.name = "Samir Das"
    superuser.photo = SimpleUploadedFile("me.png", buffer.getvalue(), content_type="image/png")
    superuser.save()

    page = client.get(reverse("admin:index")).content.decode()
    assert "/dj-static/brand/logo.png" in page  # the website's logo, top of the sidebar and as favicon
    assert "/dj-static/core/admin.css" in page  # pointer cursor on everything clickable
    assert superuser.photo.url in page and "Samir Das" in page
    assert "None None" not in page
