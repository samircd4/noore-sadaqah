"""Admin saves tell Next.js which cached answers are stale (core/revalidate.py, ARCHITECTURE.md)."""

import json

import pytest
import responses

from content.models import Fund
from core.models import SiteSettings, Stat

pytestmark = pytest.mark.django_db

HOOK = "http://frontend.test/internal/revalidate"


@pytest.fixture
def hook(settings):
    settings.FRONTEND_INTERNAL_URL = "http://frontend.test"
    settings.REVALIDATE_SECRET = "test-secret"  # noqa: S105
    with responses.RequestsMock() as mock:
        mock.post(HOOK, json={"ok": True})
        yield mock


def test_saving_a_fund_revalidates_its_tags(hook, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        Fund.objects.create(slug="water", title_bn="পানি", summary_bn="x", body_bn="x")
    call = hook.calls[0].request
    assert call.headers["X-Revalidate-Secret"] == "test-secret"
    assert json.loads(call.body) == {"tags": ["campaigns", "funds", "programs", "transparency"]}


def test_a_settings_row_revalidates_the_site(hook, django_capture_on_commit_callbacks):
    SiteSettings.load()
    with django_capture_on_commit_callbacks(execute=True):
        Stat.objects.create(value=10, label_bn="x")
    assert json.loads(hook.calls[-1].request.body) == {"tags": ["site"]}


def test_off_without_settings(django_capture_on_commit_callbacks):
    with responses.RequestsMock() as mock, django_capture_on_commit_callbacks(execute=True):
        Fund.objects.create(slug="trees", title_bn="গাছ", summary_bn="x", body_bn="x")
    assert len(mock.calls) == 0
