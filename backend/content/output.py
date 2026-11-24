"""
The JSON each public content endpoint returns (API.md "Public content"), in one language: `_bn` / `_en` fields are
resolved here, with Bengali when the English is empty. Same keys as the frontend mock (frontend/src/mocks/routes).
"""

from datetime import UTC

from django.core.cache import cache
from django.db.models import Count, Sum

from core.images import image_json
from core.markdown import to_html
from core.models import SiteSettings
from core.utils import translated


def iso(moment):
    """A datetime as ISO 8601 in UTC with "Z" (API.md "Dates"), or None."""
    return moment.astimezone(UTC).isoformat().replace("+00:00", "Z") if moment else None


def cover(obj, lang, prefix="cover", field=None):
    """The {url, alt, width, height} of obj.<prefix>_image (or `field`), or None."""
    name = field or f"{prefix}_image"
    return image_json(
        getattr(obj, name),
        getattr(obj, f"{prefix}_alt_bn", ""),
        getattr(obj, f"{prefix}_alt_en", ""),
        getattr(obj, f"{prefix}_width", None),
        getattr(obj, f"{prefix}_height", None),
        lang,
    )


def picture(obj, lang, field="image"):
    """{url, alt, width, height} for a model whose image fields are image, alt_bn/en, <field>_width/_height."""
    return image_json(
        getattr(obj, field),
        obj.alt_bn,
        obj.alt_en,
        getattr(obj, f"{field}_width", None) or getattr(obj, "width", None),
        getattr(obj, f"{field}_height", None) or getattr(obj, "height", None),
        lang,
    )


# ---- /site/ -----------------------------------------------------------------------------------------------------


def site_json(lang):
    from donations.serializers import methods_we_can_take  # here, not at the top: donations imports content

    site = SiteSettings.load()
    t = lambda field: translated(site, field, lang)  # noqa: E731
    images = {image.slot: picture(image, lang) for image in site.homeimage_set.all()}
    return {
        "stats": [
            {"value": s.value, "suffix": s.suffix, "label": translated(s, "label", lang)} for s in site.stat_set.all()
        ],
        "contact": {
            "address": t("address"),
            "phone": site.phone,
            "whatsapp": site.whatsapp,
            "email": site.email,
            "hours": t("hours"),
            "map_embed_url": site.map_embed_url,
        },
        "social": {k: getattr(site, k) for k in ("facebook", "youtube", "instagram", "linkedin")},
        "quote": {"text": t("quote_text"), "source": t("quote_source")},
        "registration": {
            "authority": t("reg_authority"),
            "number": site.reg_number,
            "date": site.reg_date.isoformat() if site.reg_date else None,
            "certificate_url": site.reg_certificate.url if site.reg_certificate else None,
        },
        "mobile_banking": [
            {"service": m.service, "number": m.number, "type": m.type} for m in site.mobilebankingaccount_set.all()
        ],
        "payment_methods": methods_we_can_take(),
        "promo_video": {"youtube_id": site.promo_youtube_id},
        "nisab": {
            "silver_price_per_gram": site.silver_price_per_gram,
            "gold_price_per_gram": site.gold_price_per_gram,
            "karat": site.karat,
            "updated_at": iso(site.nisab_updated_at),
        },
        "fitra": {
            "year": site.fitra_year,
            "rates": [{"item": translated(r, "item", lang), "amount": r.amount} for r in site.fitrarate_set.all()],
            "cutoff": iso(site.fitra_cutoff),
            "open": site.fitra_is_open,
        },
        "zakat_enabled": site.zakat_enabled,
        "home_images": {
            slot: images.get(slot) for slot in ("hero", "about_main", "about_small", "quote", "volunteer", "footer")
        },  # fmt: skip
        "about": {"mission": t("mission"), "vision": t("vision")},
        "contact_faq": [
            {"q": translated(f, "q", lang), "a": translated(f, "a", lang)} for f in site.contactfaq_set.all()
        ],
    }


# ---- funds and programs -----------------------------------------------------------------------------------------


def fund_json(fund, lang, detail=False):
    out = {
        "slug": fund.slug,
        "title": translated(fund, "title", lang),
        "summary": translated(fund, "summary", lang),
        "cover": cover(fund, lang),
        "preset_amounts": fund.preset_amounts,
        "min_amount": fund.min_amount,
        "is_zakat_eligible": fund.is_zakat_eligible,
        "is_fitra": fund.is_fitra,
        "allow_recurring": fund.allow_recurring,
        "bank_details": [
            {k: getattr(b, k) for k in ("bank", "account_name", "branch", "number", "routing", "swift")}
            for b in fund.bank_accounts.all()
        ],
    }
    if detail:
        out["body_html"] = to_html(translated(fund, "body", lang))
    return out


def fund_ref(fund, lang):
    return {"slug": fund.slug, "title": translated(fund, "title", lang)} if fund else None


def program_json(program, lang):
    return {
        "slug": program.slug,
        "badge": translated(program, "badge", lang),
        "title": translated(program, "title", lang),
        "summary": translated(program, "summary", lang),
        "cover": cover(program, lang),
        "fund": fund_ref(program.fund, lang),
    }


def program_detail_json(program, related, lang):
    fund = program.fund
    return {
        **program_json(program, lang),
        "body_html": to_html(translated(program, "body", lang)),
        "goals": [translated(g, "text", lang) for g in program.goals.all()],
        "beneficiary": translated(program, "beneficiary", lang),
        "area": translated(program, "area", lang),
        "duration": translated(program, "duration", lang),
        "faq": [{"q": translated(f, "q", lang), "a": translated(f, "a", lang)} for f in program.faqs.all()],
        "impact": [
            {"year": i.year, "metric": translated(i, "metric", lang), "value": i.value} for i in program.impacts.all()
        ],
        "images": [picture(i, lang) for i in program.images.all()],
        # the detail's fund adds preset_amounts for the donate box beside the story
        "fund": {**fund_ref(fund, lang), "preset_amounts": fund.preset_amounts} if fund else None,
        "related": [program_json(p, lang) for p in related],
    }


# ---- campaigns --------------------------------------------------------------------------------------------------


def campaign_totals(campaign):
    """Money raised, donor count and the last 10 donors (first names only), cached 60 seconds (DATA_MODEL.md:
    never a stored running total). Counts only PAID donations, plus what was raised outside the website."""
    key = f"campaign_totals:{campaign.pk}"
    totals = cache.get(key)
    if totals is None:
        from donations.models import Donation, Status

        paid = Donation.objects.filter(campaign=campaign, status=Status.PAID)
        summary = paid.aggregate(raised=Sum("amount"), donors=Count("pk"))
        recent = paid.order_by("-paid_at")[:10].values("donor_name", "is_anonymous", "amount", "paid_at")
        totals = {
            "raised": campaign.offline_raised + (summary["raised"] or 0),
            "donors": campaign.offline_donors + summary["donors"],
            "recent": [
                {
                    "name": None if d["is_anonymous"] else (d["donor_name"].split() or [None])[0],
                    "amount": d["amount"],
                    "paid_at": iso(d["paid_at"]),
                }
                for d in recent
            ],
        }
        cache.set(key, totals, 60)
    return totals


def campaign_json(campaign, lang):
    totals = campaign_totals(campaign)
    goal = campaign.goal_amount
    return {
        "slug": campaign.slug,
        "title": translated(campaign, "title", lang),
        "summary": translated(campaign, "summary", lang),
        "body_html": to_html(translated(campaign, "body", lang)),
        "cover": cover(campaign, lang),
        "goal_amount": goal,
        "raised_amount": totals["raised"],
        "percent": min(100, round(totals["raised"] * 100 / goal)) if goal else 0,
        "donor_count": totals["donors"],
        "monthly_options": campaign.monthly_options,
        "highlighted_option": campaign.highlighted_option,
        "starts_at": iso(campaign.starts_at),
        "ends_at": iso(campaign.ends_at),
        "is_ended": campaign.has_ended(),
        "fund": fund_ref(campaign.fund, lang),
        "recent_donors": totals["recent"],
    }


# ---- news, gallery and the organisation -------------------------------------------------------------------------


def category_json(category, lang):
    return {"slug": category.slug, "name": translated(category, "name", lang)}


def post_json(post, lang, detail=False):
    out = {
        "slug": post.slug,
        "title": translated(post, "title", lang),
        "excerpt": translated(post, "excerpt", lang),
        "cover": cover(post, lang),
        "category": category_json(post.category, lang),
        "published_at": iso(post.published_at),
    }
    if detail:
        out["body_html"] = to_html(translated(post, "body", lang))
    return out


def gallery_json(item, lang):
    return {
        "id": item.pk,
        "kind": item.kind,
        "image": picture(item, lang),
        "youtube_id": item.youtube_id,
        "caption": translated(item, "caption", lang),
        "category": category_json(item.category, lang),
    }


def person_json(person, lang):
    return {
        "name": translated(person, "name", lang),
        "role": translated(person, "role", lang),
        "bio": translated(person, "bio", lang),
        # the photo is shown only with consent (CONTENT.md §6)
        "photo": cover(person, lang, prefix="photo", field="photo") if person.photo_consent else None,
    }


def report_json(report, lang):
    return {
        "id": report.pk,
        "kind": report.kind,
        "year": report.year,
        "title": translated(report, "title", lang),
        "file_url": report.file.url if report.file else None,
        "published_at": report.published_at.isoformat(),
    }


def job_json(job, lang):
    return {
        "slug": job.slug,
        "title": translated(job, "title", lang),
        "location": translated(job, "location", lang),
        "body_html": to_html(translated(job, "body", lang)),
        "apply_email": job.apply_email,
        "apply_url": job.apply_url,
        "closes_at": job.closes_at.isoformat() if job.closes_at else None,
    }
