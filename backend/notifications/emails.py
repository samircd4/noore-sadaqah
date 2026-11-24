"""
What each email says: subject, HTML and plain text, in the donor's language (docs/NOTIFICATIONS.md "Email templates").
Templates: templates/emails/<name>.<lang>.html and .txt, inside templates/emails/base.html.
The Bengali wording needs the foundation's approval before launch (docs/CONTENT.md).
"""

import logging

from django.conf import settings
from django.template.loader import render_to_string

from core.models import SiteSettings
from core.utils import bn_date, taka, translated
from donations.receipts import is_placeholder, receipt_pdf, receipt_url

logger = logging.getLogger(__name__)

FOUNDATION = {"bn": "নূরে সাদাকাহ ফাউন্ডেশন", "en": "Noore Sadaqah Foundation"}
SUBJECTS = {
    "receipt": {"bn": "দানের রসিদ {receipt_no}", "en": "Donation receipt {receipt_no}"},
}


def language_of(donation):
    return "en" if donation.locale == "en" else "bn"


def in_language(site, field, language):
    """site.<field>_<language>, falling back to the other language."""
    other = "bn" if language == "en" else "en"
    return (getattr(site, f"{field}_{language}") or getattr(site, f"{field}_{other}") or "").strip()


def footer(language):
    """Foundation address and registration for the footer; sample or unconfirmed facts are left out (CONTENT.md)."""
    site = SiteSettings.load()
    reg = " ".join(text for text in (in_language(site, "reg_authority", language), site.reg_number.strip()) if text)
    lines = [in_language(site, "address", language), site.phone, site.email]
    return {
        "name": FOUNDATION[language],
        "lines": [line for line in lines if not is_placeholder(line)],
        "registration": None if is_placeholder(reg) else reg,
    }


def render(name, language, context):
    """(subject, html, text) for one email template."""
    context = {
        **context,
        "lang": language,
        "site_url": settings.SITE_URL,
        "footer": footer(language),
        "foundation": FOUNDATION[language],
    }
    subject = SUBJECTS[name][language].format(**context)
    html = render_to_string(f"emails/{name}.{language}.html", {**context, "subject": subject})
    text = render_to_string(f"emails/{name}.{language}.txt", {**context, "subject": subject})
    return subject, html, text


def receipt_email(donation):
    """The receipt email with the PDF attached. If the PDF can't be made (no Pango on this machine), the email
    carries the signed receipt link instead, so the donor still gets the receipt."""
    language = language_of(donation)
    try:
        attachments = [(f"receipt-{donation.receipt_no}.pdf", receipt_pdf(donation), "application/pdf")]
    except Exception as exc:  # e.g. WeasyPrint can't load Pango or a font: the link still gets the donor the receipt
        logger.warning("receipt PDF for donation %s failed (%s); sending the link", donation.pk, type(exc).__name__)
        attachments = []
    subject, html, text = render(
        "receipt",
        language,
        {
            "donation": donation,
            "receipt_no": donation.receipt_no,  # English digits in both languages (easier to search)
            "amount": taka(donation.amount, language),
            "fund": translated(donation.fund, "title", language),
            "date": bn_date(donation.paid_at, language),
            "account_url": f"{settings.SITE_URL}/{language}/account",
            "receipt_link": None if attachments else settings.SITE_URL + receipt_url(donation.gateway_ref),
        },
    )
    return subject, html, text, attachments
