"""
`python manage.py seed`: loads the frontend mock fixtures (DATA_MODEL.md "Seed data"), so Django serves the same
funds, campaigns and site settings the mocked pages show. Idempotent: run it again after a fixture changes.

This slice seeds funds, campaigns and SiteSetting rows; programs, posts and the rest come with B1.
Cover images aren't downloaded (staff upload them in the admin).
"""

import json

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_datetime

from accounts.models import User
from content.models import Campaign, Fund
from core.models import SiteSetting


def load(name):
    path = settings.SEED_FIXTURES_DIR / f"{name}.json"
    if not path.exists():
        raise CommandError(f"Missing fixture {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def bilingual(value):
    """{"bn": …, "en": …} → (bn, en); a plain string is Bengali."""
    if isinstance(value, dict):
        return value.get("bn") or "", value.get("en") or ""
    return value or "", ""


def texts(item, *fields):
    out = {}
    for field in fields:
        bn, en = bilingual(item.get(field))
        out[f"{field}_bn"], out[f"{field}_en"] = bn, en
    return out


def cover_alt(item):
    bn, en = bilingual((item.get("cover") or {}).get("alt"))
    return {"cover_alt_bn": bn, "cover_alt_en": en}


class Command(BaseCommand):
    help = "Load funds, campaigns and site settings from frontend/src/mocks/fixtures (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        funds = {}
        for item in load("funds"):
            fund, _ = Fund.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    **texts(item, "title", "summary", "body"),
                    **cover_alt(item),
                    "preset_amounts": item.get("preset_amounts") or [100, 200, 500, 1000],
                    "min_amount": item.get("min_amount", 10),
                    "is_zakat_eligible": bool(item.get("is_zakat_eligible")),
                    "is_fitra": bool(item.get("is_fitra")),
                    "allow_recurring": bool(item.get("allow_recurring", True)),
                    "bank_details": item.get("bank_details") or [],
                    "sort_order": item.get("sort_order", 0),
                    "is_active": item.get("is_active", True),
                },
            )
            funds[fund.slug] = fund

        for item in load("campaigns"):
            fund = funds.get(item["fund"])
            if fund is None:
                raise CommandError(f"Campaign {item['slug']} names unknown fund {item['fund']}")
            defaults = {
                **texts(item, "title", "summary", "body"),
                **cover_alt(item),
                "goal_amount": item["goal_amount"],
                "monthly_options": item.get("monthly_options") or [500, 1000, 2000],
                "highlighted_option": item.get("highlighted_option"),
                "ends_at": parse_datetime(item["ends_at"]) if item.get("ends_at") else None,
                "fund": fund,
                "is_featured": bool(item.get("is_featured")),
                "is_active": item.get("is_active", True),
            }
            if item.get("starts_at"):
                defaults["starts_at"] = parse_datetime(item["starts_at"])
            Campaign.objects.update_or_create(slug=item["slug"], defaults=defaults)

        site = load("site")
        for key, value in site.items():
            if key.startswith("_"):
                continue
            SiteSetting.objects.update_or_create(key=key, defaults={"value": value})

        if settings.SEED_ADMIN_EMAIL and settings.SEED_ADMIN_PASSWORD:
            email = settings.SEED_ADMIN_EMAIL.lower()
            if not User.objects.filter(email=email).exists():
                User.objects.create_superuser(email=email, password=settings.SEED_ADMIN_PASSWORD)
                self.stdout.write("Created the first superuser.")

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(funds)} funds, {Campaign.objects.count()} campaigns, "
                f"{SiteSetting.objects.count()} site settings."
            )
        )
