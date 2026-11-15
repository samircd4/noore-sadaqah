"""Receipt links and PDFs (docs/API.md "Receipts", docs/QA_CHECKLIST.md §7)."""

from datetime import timedelta

import pytest
from django.utils import timezone

from content.models import Fund
from core.models import SiteSetting
from donations.models import Donation, Status
from donations.receipts import amount_in_words, receipt_html, receipt_url
from donations.services import mark_paid

pytestmark = pytest.mark.usefixtures("seeded")


@pytest.mark.parametrize(
    ("amount", "words"),
    [
        (1, "One taka only"),
        (15, "Fifteen taka only"),
        (100, "One hundred taka only"),
        (1500, "One thousand five hundred taka only"),
        (100_000, "One lakh taka only"),
        (100_021, "One lakh twenty-one taka only"),
        (12_500_000, "One crore twenty-five lakh taka only"),
        (2_045_301, "Twenty lakh forty-five thousand three hundred one taka only"),
    ],
)
def test_amount_in_words(amount, words):
    assert amount_in_words(amount) == words


def paid(**extra):
    donation = Donation.objects.create(
        amount=1500,
        fund=Fund.objects.get(slug="sadaqah"),
        donor_name="Karim Uddin",
        donor_phone="01712345678",
        method="sslcommerz",
        **extra,
    )
    donation, _ = mark_paid(donation.pk, txn_id="BANKTXN123", payload={})
    return donation


@pytest.fixture
def fake_pdf(monkeypatch):
    """Skip the slow PDF step in most tests: the view returns these bytes instead."""
    monkeypatch.setattr("donations.views.receipt_pdf", lambda donation: b"%PDF-1.7 fake")


@pytest.mark.usefixtures("fake_pdf")
class TestLink:
    def test_signed_link_downloads_the_pdf(self, client):
        donation = paid()
        r = client.get(receipt_url(donation.gateway_ref))
        assert r.status_code == 200
        assert r["Content-Type"] == "application/pdf"
        assert r["Content-Disposition"] == f'attachment; filename="receipt-{donation.receipt_no}.pdf"'
        assert r["Cache-Control"] == "private, no-store"

    def test_email_link_on_the_api_path_works_too(self, client):
        donation = paid()
        token = receipt_url(donation.gateway_ref).removeprefix("/r/")
        assert client.get(f"/api/v1/receipts/{token}/").status_code == 200

    @pytest.mark.parametrize("change", ["wrong-signature", "unknown-ref", "no-dash"])
    def test_wrong_links_are_404(self, client, change):
        donation = paid()
        good = receipt_url(donation.gateway_ref)
        bad = {
            "wrong-signature": good[:-1] + ("a" if good[-1] != "a" else "b"),
            "unknown-ref": receipt_url("NSDDOESNOTEXIST"),
            "no-dash": f"/r/{donation.gateway_ref}",
        }[change]
        assert client.get(bad).status_code == 404

    def test_unpaid_donation_has_no_receipt(self, client):
        donation = Donation.objects.create(
            amount=500,
            fund=Fund.objects.get(slug="sadaqah"),
            donor_name="X",
            donor_phone="01712345678",
            method="sslcommerz",
        )
        assert client.get(receipt_url(donation.gateway_ref)).status_code == 404

    def test_link_expires_after_90_days(self, client):
        donation = paid()
        Donation.objects.filter(pk=donation.pk).update(paid_at=timezone.now() - timedelta(days=91))
        assert client.get(receipt_url(donation.gateway_ref)).status_code == 404

    def test_refunded_donation_still_has_its_receipt(self, client):
        donation = paid()
        Donation.objects.filter(pk=donation.pk).update(status=Status.REFUNDED)
        assert client.get(receipt_url(donation.gateway_ref)).status_code == 200

    def test_too_many_downloads_from_one_ip(self, client):
        url = receipt_url(paid().gateway_ref)
        for _ in range(30):
            assert client.get(url).status_code == 200
        assert client.get(url).status_code == 429


class TestContent:
    def test_receipt_is_in_english_with_everything_on_it(self):
        donation = paid(on_behalf_of="আমেনা বেগম", on_behalf_permission=True, is_anonymous=True, locale="bn")
        html = receipt_html(donation)
        for text in (
            "Noore Sadaqah Foundation",
            "Donation receipt",
            donation.receipt_no,
            "Karim Uddin",  # the real name even when anonymous on the website
            "আমেনা বেগম",  # names stay as the donor typed them
            "Sadaqah",
            "BDT 1,500",
            "One thousand five hundred taka only",
            "BANKTXN123",
            "Gazipur",
        ):
            assert text in html, text
        assert "REFUNDED" not in html

    def test_no_bengali_labels_even_for_bengali_donors(self):
        html = receipt_html(paid(locale="bn"))
        assert not any("ঀ" <= ch <= "৿" for ch in html), "Bengali text found"

    def test_sample_registration_is_never_printed(self):
        assert "sample" not in receipt_html(paid()).lower()

    def test_confirmed_registration_is_printed(self):
        SiteSetting.objects.filter(key="registration").update(
            value={"authority": {"en": "Department of Social Services"}, "number": "D-1234/2021"}
        )
        assert "Registration: Department of Social Services D-1234/2021" in receipt_html(paid())

    def test_refunded_receipt_is_marked(self):
        donation = paid()
        Donation.objects.filter(pk=donation.pk).update(status=Status.REFUNDED)
        donation.refresh_from_db()
        assert "REFUNDED" in receipt_html(donation)


def test_real_pdf_renders(client):
    """Needs WeasyPrint's Pango library (MSYS2 on Windows, apt on Ubuntu); skipped where it's missing."""
    try:
        import weasyprint
    except OSError:
        pytest.skip("Pango isn't installed: see backend/CLAUDE.md")
    donation = paid()
    Donation.objects.filter(pk=donation.pk).update(donor_name="করিম উদ্দিন")  # typed in Bengali
    donation.refresh_from_db()
    r = client.get(receipt_url(donation.gateway_ref))
    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")
    # The same receipt without compression shows which fonts are embedded: the Bengali name needs the Bengali font.
    from donations.receipts import STATIC

    raw = weasyprint.HTML(string=receipt_html(donation), base_url=str(STATIC)).write_pdf(uncompressed_pdf=True)
    assert b"Noto-Sans-Bengali" in raw
