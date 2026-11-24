"""
Donation receipts: the signed link, the amount in words and the PDF (docs/DONATION_FLOW.md "Receipts").

The link sent by SMS is /r/NSD7K2M9QX4PA-k3j9x2m1qa: our transaction id + a 10-letter signature made with
RECEIPT_TOKEN_SECRET. Only someone who got the link can open it, and only for 90 days after the payment.
The PDF is in English for every donor, made fresh each time (never stored) by WeasyPrint. A Bengali font is
still embedded, because donors may type their name in Bengali.
"""

import base64
import hashlib
import hmac
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

from core.models import SiteSettings
from core.utils import translated

from .models import Donation, Status

LINK_DAYS = 90
STATIC = Path(settings.BASE_DIR) / "static"

# ---- The signed link ----------------------------------------------------------------------------------------------


def signature(gateway_ref):
    digest = hmac.new(settings.RECEIPT_TOKEN_SECRET.encode(), gateway_ref.encode(), hashlib.sha256).digest()
    return base64.b32encode(digest).decode().lower()[:10]


def receipt_url(gateway_ref):
    """/r/NSD7K2M9QX4PA-k3j9x2m1qa (docs/API.md "Receipts")."""
    return f"/r/{gateway_ref}-{signature(gateway_ref)}"


def donation_for_link(token):
    """The donation behind a receipt link, or None if the link is wrong, expired or the donation isn't paid."""
    gateway_ref, _, sig = token.rpartition("-")
    if not gateway_ref or not hmac.compare_digest(sig, signature(gateway_ref)):
        return None
    donation = Donation.objects.select_related("fund").filter(gateway_ref=gateway_ref).first()
    if donation is None or donation.status not in (Status.PAID, Status.REFUNDED) or donation.paid_at is None:
        return None
    if timezone.now() - donation.paid_at > timedelta(days=LINK_DAYS):
        return None
    return donation


# ---- Amount in words ----------------------------------------------------------------------------------------------

ONES = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
]  # fmt: skip
TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]


def under_100(n):
    """0–99 in words: 21 → "twenty-one"."""
    if n < 20:
        return ONES[n]
    tens, ones = divmod(n, 10)
    return TENS[tens] + (f"-{ONES[ones]}" if ones else "")


def amount_in_words(amount):
    """1500 → "One thousand five hundred taka only". Counted the Bangladeshi way: crore (10,000,000),
    lakh (100,000), thousand, hundred."""

    def words(n):
        parts = []
        crore, n = divmod(n, 10_000_000)
        lakh, n = divmod(n, 100_000)
        thousand, n = divmod(n, 1000)
        hundred, n = divmod(n, 100)
        if crore:
            parts.append(f"{words(crore)} crore")
        if lakh:
            parts.append(f"{under_100(lakh)} lakh")
        if thousand:
            parts.append(f"{under_100(thousand)} thousand")
        if hundred:
            parts.append(f"{under_100(hundred)} hundred")
        if n:
            parts.append(under_100(n))
        return " ".join(parts)

    text = f"{words(amount) if amount else 'zero'} taka only"
    return text[0].upper() + text[1:]


# ---- What the receipt says (always in English) -------------------------------------------------------------------

METHODS = {
    "sslcommerz": "Card / mobile banking (SSLCommerz)",
    "bkash": "bKash",
    "bank_transfer": "Bank transfer",
    "cash": "Cash",
    "bkash_offline": "bKash (direct)",
    "nagad_offline": "Nagad (direct)",
    "rocket_offline": "Rocket (direct)",
}


def is_placeholder(text):
    """Sample or unconfirmed facts never go on a receipt (docs/CONTENT.md: TODO items must not go live)."""
    return not text or any(mark in text.lower() for mark in ("sample", "todo", "নমুনা"))


def foundation_facts():
    """Address, phone, email and registration from the site settings (English); placeholders are left out."""
    site = SiteSettings.load()
    reg_text = " ".join(part.strip() for part in (site.reg_authority_en, site.reg_number) if part.strip())
    lines = [site.address_en.strip(), site.phone, site.email]
    return {
        "lines": [line for line in lines if not is_placeholder(line)],
        "registration": None if is_placeholder(reg_text) else reg_text,
    }


def receipt_context(donation):
    paid_on = timezone.localtime(donation.paid_at)  # the date in Dhaka
    rows = [
        ("Receipt no.", donation.receipt_no),
        ("Date", f"{paid_on.day} {paid_on:%B} {paid_on.year}"),
        ("Donor", donation.donor_name),  # always the real name: "anonymous" only hides it on the website
    ]
    if donation.on_behalf_of:
        rows.append(("On behalf of", donation.on_behalf_of))
    rows += [
        ("Fund", translated(donation.fund, "title", "en")),
        ("Payment method", METHODS.get(donation.method, donation.method)),
    ]
    if donation.gateway_txn_id or donation.reference:
        rows.append(("Transaction ID", donation.gateway_txn_id or donation.reference))
    return {
        "foundation": foundation_facts(),
        "rows": rows,
        "amount": f"BDT {donation.amount:,}",
        "amount_words": amount_in_words(donation.amount),
        "refunded": donation.status == Status.REFUNDED,
    }


def receipt_html(donation):
    return render_to_string("receipts/receipt.html", receipt_context(donation))


def receipt_pdf(donation):
    """The receipt as PDF bytes. WeasyPrint is imported here so the rest of the site runs without Pango."""
    from weasyprint import HTML

    return HTML(string=receipt_html(donation), base_url=str(STATIC)).write_pdf()
