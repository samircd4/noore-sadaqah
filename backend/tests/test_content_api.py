"""Public content endpoints (docs/API.md "Public content")."""

from datetime import date, datetime, timedelta
from io import BytesIO

import pytest
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from content.models import Campaign, Fund, GalleryItem, Job, Page, Person, Post, PostCategory, Program, Report
from core.models import SiteSettings
from donations.models import Donation, OfflineTotal, Status

pytestmark = pytest.mark.usefixtures("seeded")


def png(width=40, height=30, name="photo.png"):
    buffer = BytesIO()
    Image.new("RGB", (width, height), "white").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


def get(api, path, lang="bn", **params):
    return api.get(f"/api/v1{path}", params, HTTP_ACCEPT_LANGUAGE=lang)


def paid(campaign=None, fund="sadaqah", amount=1000, paid_at=None, **fields):
    """A PAID donation, saved directly (mark_paid has its own tests)."""
    moment = paid_at or timezone.now()
    count = Donation.objects.count() + 1
    return Donation.objects.create(
        fund=Fund.objects.get(slug=fund),
        campaign=campaign,
        amount=amount,
        donor_name=fields.pop("donor_name", "Rahim Uddin"),
        donor_phone="01712345678",
        method="sslcommerz",
        status=Status.PAID,
        paid_at=moment,
        receipt_no=f"NSF-{moment.year}-{count:06d}",
        **fields,
    )


class TestSite:
    def test_shape_and_language(self, api):
        bn, en = get(api, "/site/").json(), get(api, "/site/", "en").json()
        assert set(bn) == {
            "stats", "contact", "social", "quote", "registration", "mobile_banking", "payment_methods",
            "promo_video", "nisab", "fitra", "zakat_enabled", "home_images", "about", "contact_faq",
        }  # fmt: skip
        assert bn["quote"]["text"].startswith("সাদাকাহ")
        assert en["quote"]["text"].startswith("Charity")
        assert bn["stats"][0] == {"value": 12500, "suffix": "+", "label": "উপকারভোগী পরিবার"}
        assert set(bn["home_images"]) == {"hero", "about_main", "about_small", "quote", "volunteer", "footer"}

    def test_english_falls_back_to_bengali(self, api):
        SiteSettings.objects.filter(pk=1).update(quote_text_en="")
        assert get(api, "/site/", "en").json()["quote"]["text"].startswith("সাদাকাহ")

    def test_only_methods_django_can_take(self, api):
        """bKash has no code yet: never offered, even though it is switched on (ROADMAP B2)."""
        assert get(api, "/site/").json()["payment_methods"] == ["sslcommerz"]
        SiteSettings.objects.filter(pk=1).update(pay_sslcommerz=False)
        assert get(api, "/site/").json()["payment_methods"] == []

    def test_fitra_opens_only_with_zakat_enabled(self, api):
        SiteSettings.objects.filter(pk=1).update(fitra_open=True)
        assert get(api, "/site/").json()["fitra"]["open"] is False
        SiteSettings.objects.filter(pk=1).update(zakat_enabled=True)
        assert get(api, "/site/").json()["fitra"]["open"] is True

    def test_public_cache_header(self, api):
        assert get(api, "/site/")["Cache-Control"] == "public, max-age=60"


class TestFunds:
    def test_list_in_order_without_body(self, api):
        funds = get(api, "/funds/").json()
        assert [f["slug"] for f in funds] == list(Fund.objects.values_list("slug", flat=True))
        assert "body_html" not in funds[0]

    def test_inactive_fund_is_hidden(self, api):
        Fund.objects.filter(slug="orphan").update(is_active=False)
        assert "orphan" not in [f["slug"] for f in get(api, "/funds/").json()]
        assert get(api, "/funds/orphan/").status_code == 404

    def test_detail_has_sanitized_body(self, api):
        Fund.objects.filter(slug="zakat").update(body_bn="## যাকাত\n\n<script>alert(1)</script> **জরুরি**")
        body = get(api, "/funds/zakat/").json()["body_html"]
        assert "<h2>যাকাত</h2>" in body and "<strong>জরুরি</strong>" in body
        assert "<script>" not in body

    def test_bank_accounts_are_rows(self, api):
        fund = Fund.objects.get(slug="zakat")
        fund.bank_accounts.create(bank="Islami Bank", account_name="NSF", number="2050", sort_order=1)
        fund.bank_accounts.create(bank="City Bank", account_name="NSF", number="1001", sort_order=0)
        rows = get(api, "/funds/zakat/").json()["bank_details"]
        assert [r["bank"] for r in rows] == ["City Bank", "Islami Bank"]
        assert set(rows[0]) == {"bank", "account_name", "branch", "number", "routing", "swift"}

    def test_cover_image_json(self, api):
        fund = Fund.objects.get(slug="sadaqah")
        fund.cover_image = png(40, 30)
        fund.save()
        cover = get(api, "/funds/sadaqah/", "en").json()["cover"]
        assert cover["url"].startswith("/media/funds/") and (cover["width"], cover["height"]) == (40, 30)
        assert cover["alt"] == fund.cover_alt_en

    def test_wide_upload_is_shrunk(self):
        fund = Fund.objects.get(slug="sadaqah")
        fund.cover_image = png(3000, 1500)
        fund.save()
        fund.refresh_from_db()
        assert (fund.cover_width, fund.cover_height) == (2000, 1000)

    def test_unknown_slug_is_404(self, api):
        response = get(api, "/funds/nope/")
        assert response.status_code == 404 and response.json() == {"error": {"code": "notFound"}}


class TestPrograms:
    def test_featured_filter(self, api):
        featured = Program.objects.filter(is_featured=True, is_active=True).count()
        assert len(get(api, "/programs/", featured=1).json()) == featured
        assert len(get(api, "/programs/").json()) == Program.objects.filter(is_active=True).count()

    def test_detail(self, api):
        program = Program.objects.exclude(fund=None).first()
        detail = get(api, f"/programs/{program.slug}/").json()
        assert len(detail["related"]) == 3 and program.slug not in [p["slug"] for p in detail["related"]]
        assert detail["goals"] == [g.text_bn for g in program.goals.all()]
        assert set(detail["faq"][0]) == {"q", "a"}
        assert set(detail["impact"][0]) == {"year", "metric", "value"}
        assert detail["fund"]["preset_amounts"] == program.fund.preset_amounts


class TestCampaigns:
    def campaign(self):
        return Campaign.objects.get(is_featured=True)

    def test_totals_count_paid_and_offline(self, api):
        campaign = self.campaign()
        paid(campaign, amount=1000, donor_name="Rahim Uddin")
        paid(campaign, amount=500, is_anonymous=True)
        Donation.objects.create(
            fund=campaign.fund, campaign=campaign, amount=9999, donor_name="X", donor_phone="01712345678",
            method="sslcommerz",
        )  # fmt: skip
        body = get(api, f"/campaigns/{campaign.slug}/").json()
        assert body["raised_amount"] == campaign.offline_raised + 1500
        assert body["donor_count"] == campaign.offline_donors + 2
        assert body["percent"] == min(100, round(body["raised_amount"] * 100 / campaign.goal_amount))
        assert [d["name"] for d in body["recent_donors"]] == [None, "Rahim"]

    def test_never_shows_contact_details(self, api):
        paid(self.campaign(), donor_email="rahim@example.com")
        text = get(api, f"/campaigns/{self.campaign().slug}/").content.decode()
        assert "01712345678" not in text and "rahim@example.com" not in text

    def test_totals_are_cached_for_a_minute(self, api):
        campaign = self.campaign()
        first = get(api, f"/campaigns/{campaign.slug}/").json()["raised_amount"]
        paid(campaign, amount=700)
        assert get(api, f"/campaigns/{campaign.slug}/").json()["raised_amount"] == first
        cache.delete(f"campaign_totals:{campaign.pk}")
        assert get(api, f"/campaigns/{campaign.slug}/").json()["raised_amount"] == first + 700

    def test_is_ended(self, api):
        campaign = self.campaign()
        Campaign.objects.filter(pk=campaign.pk).update(ends_at=timezone.now() - timedelta(days=1))
        assert get(api, f"/campaigns/{campaign.slug}/").json()["is_ended"] is True


class TestPosts:
    def test_drafts_and_scheduled_posts_are_hidden(self, api):
        draft, scheduled = Post.objects.filter(published_at__lte=timezone.now())[:2]
        Post.objects.filter(pk=draft.pk).update(published_at=None)
        Post.objects.filter(pk=scheduled.pk).update(published_at=timezone.now() + timedelta(days=2))
        slugs = [p["slug"] for p in get(api, "/posts/", limit=100).json()["results"]]
        assert draft.slug not in slugs and scheduled.slug not in slugs
        assert get(api, f"/posts/{draft.slug}/").status_code == 404

    def test_pagination(self, api):
        total = Post.objects.filter(published_at__lte=timezone.now()).count()
        first = get(api, "/posts/").json()
        assert (first["count"], first["page"], len(first["results"])) == (total, 1, min(12, total))
        assert first["pages"] == -(-total // 12)
        assert len(get(api, "/posts/", limit=3).json()["results"]) == 3
        assert get(api, "/posts/", page=first["pages"] + 1).status_code == 404

    def test_newest_first_and_category_filter(self, api):
        results = get(api, "/posts/", limit=100).json()["results"]
        assert results == sorted(results, key=lambda p: p["published_at"], reverse=True)
        category = PostCategory.objects.first()
        filtered = get(api, "/posts/", category=category.slug, limit=100).json()["results"]
        assert filtered and all(p["category"]["slug"] == category.slug for p in filtered)

    def test_detail_has_body_and_related(self, api):
        post = Post.objects.filter(published_at__lte=timezone.now()).first()
        detail = get(api, f"/posts/{post.slug}/").json()
        assert detail["body_html"] and len(detail["related"]) == 3

    def test_categories(self, api):
        assert get(api, "/post-categories/").json()[0] == {
            "slug": PostCategory.objects.first().slug,
            "name": PostCategory.objects.first().name_bn,
        }


class TestGallery:
    def test_kind_filter_and_limit(self, api):
        videos = get(api, "/gallery/", kind="video", limit=100).json()
        assert videos["count"] == GalleryItem.objects.filter(kind="video").count()
        assert all(item["kind"] == "video" for item in videos["results"])
        assert len(get(api, "/gallery/", limit=6).json()["results"]) == 6

    def test_unpublished_items_are_hidden(self, api):
        GalleryItem.objects.update(is_published=False)
        assert get(api, "/gallery/").json()["count"] == 0

    def test_new_item_gets_a_fresh_id_after_seed(self):
        """Seed keeps the fixture ids; the next item staff add must not collide with them."""
        item = GalleryItem.objects.create(kind="video", youtube_id="abc", category=PostCategory.objects.first())
        assert item.pk > max(GalleryItem.objects.exclude(pk=item.pk).values_list("pk", flat=True))


class TestOrganisation:
    def test_photo_only_with_consent(self, api):
        person = Person.objects.first()
        person.photo = png()
        person.photo_alt_bn = "ছবি"
        person.photo_consent = False
        person.save()
        assert get(api, "/people/").json()[0]["photo"] is None
        Person.objects.filter(pk=person.pk).update(photo_consent=True)
        assert get(api, "/people/").json()[0]["photo"]["alt"] == "ছবি"

    def test_report_filters(self, api):
        assert all(r["kind"] == "audit" for r in get(api, "/reports/", kind="audit").json())
        assert all(r["year"] == 2025 for r in get(api, "/reports/", year=2025).json())
        reports = get(api, "/reports/").json()
        assert [r["published_at"] for r in reports] == sorted((r["published_at"] for r in reports), reverse=True)

    def test_only_open_jobs(self, api):
        open_job, closed, expired, today = Job.objects.all()[:4]
        Job.objects.filter(pk=closed.pk).update(is_open=False)
        Job.objects.filter(pk=expired.pk).update(closes_at=timezone.localdate() - timedelta(days=1))
        Job.objects.filter(pk=today.pk).update(closes_at=timezone.localdate())
        slugs = [j["slug"] for j in get(api, "/jobs/").json()]
        assert closed.slug not in slugs and expired.slug not in slugs and today.slug in slugs

    def test_page(self, api):
        page = Page.objects.get(slug="privacy")
        body = get(api, "/pages/privacy/").json()
        assert body["title"] == page.title_bn and body["updated_at"] == timezone.localdate(page.updated_at).isoformat()
        assert get(api, "/pages/nope/").status_code == 404


class TestTransparency:
    def test_years_funds_and_zakat_last(self, api):
        OfflineTotal.objects.all().delete()
        dhaka_new_year = timezone.make_aware(datetime(2027, 1, 1, 0, 30))  # 2026-12-31 18:30 UTC
        paid(fund="zakat", amount=300, paid_at=dhaka_new_year)
        paid(fund="sadaqah", amount=200, paid_at=dhaka_new_year)
        paid(fund="sadaqah", amount=100, paid_at=timezone.make_aware(datetime(2026, 6, 1)))
        OfflineTotal.objects.create(year=2026, fund=Fund.objects.get(slug="sadaqah"), total=1000)

        years = get(api, "/transparency/totals/").json()["years"]
        assert [y["year"] for y in years] == [2027, 2026]
        assert [(f["slug"], f["total"], f["is_zakat"]) for f in years[0]["funds"]] == [
            ("sadaqah", 200, False),
            ("zakat", 300, True),
        ]
        assert years[0]["total"] == 500 and years[1]["total"] == 1100

    def test_pending_donations_dont_count(self, api):
        OfflineTotal.objects.all().delete()
        Donation.objects.create(
            fund=Fund.objects.get(slug="sadaqah"), amount=500, donor_name="X", donor_phone="01712345678",
            method="sslcommerz",
        )  # fmt: skip
        assert get(api, "/transparency/totals/").json() == {"years": []}


def test_report_file_url(api):
    Report.objects.filter(pk=1).update(file="reports/annual.pdf")
    report = next(r for r in get(api, "/reports/").json() if r["id"] == 1)
    assert report["file_url"] == "/media/reports/annual.pdf"
    assert date.fromisoformat(report["published_at"])
