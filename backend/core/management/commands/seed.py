"""
`python manage.py seed`: loads the frontend mock fixtures (DATA_MODEL.md "Seed data") so Django serves the same
content the mocked pages show: funds, campaigns, programs, news, gallery, people, reports, jobs, pages, site settings
and the offline totals. Also creates the staff Groups and, from .env, the first superuser.

Idempotent: run it again after a fixture changes. It overwrites the seeded rows with the fixture values (and their
row tables, such as a program's goals), so don't run it on a site where staff have edited the content.

Images: the fixtures' photo URLs are downloaded once into MEDIA_ROOT (skipped when the row already has one), because
the pages expect every card to have a picture. --no-images skips the downloads (no internet, or a quick reset).
"""

import hashlib
import json
import mimetypes

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.core.management.color import no_style
from django.db import connection, transaction
from django.utils.dateparse import parse_date, parse_datetime

from accounts.models import User
from content.models import (
    Campaign,
    Fund,
    FundBankAccount,
    GalleryItem,
    Job,
    Page,
    Person,
    Post,
    PostCategory,
    Program,
    ProgramFaq,
    ProgramGoal,
    ProgramImage,
    ProgramImpact,
    Report,
)
from core import revalidate
from core.groups import apply_groups
from core.models import ContactFaq, FitraRate, HomeImage, MobileBankingAccount, SiteSettings, Stat
from donations.models import OfflineTotal


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


def texts(item, *fields, prefix=None):
    """{"title": {"bn", "en"}} → {"title_bn": …, "title_en": …}; with prefix, e.g. {"cover_alt_bn": …}."""
    out = {}
    for field in fields:
        bn, en = bilingual(item.get(field))
        name = prefix or field
        out[f"{name}_bn"], out[f"{name}_en"] = bn, en
    return out


def alt(image, prefix):
    return texts(image or {}, "alt", prefix=prefix)


def when(text):
    return parse_datetime(text) if text else None


class Files:
    """Downloads each fixture URL once (or copies it from frontend/public for "/samples/…" links)."""

    def __init__(self, command, enabled):
        self.command, self.enabled, self.saved, self.failed = command, enabled, {}, 0

    def stored_name(self, url, folder):
        if not self.enabled or not url:
            return None
        if url in self.saved:
            return self.saved[url]
        try:
            content, extension = self.fetch(url)
        except (OSError, requests.RequestException) as exc:
            self.failed += 1
            self.command.stderr.write(f"  could not get {url[:80]}: {type(exc).__name__}")
            self.saved[url] = None
            return None
        name = f"seed/{folder}/{hashlib.sha1(url.encode()).hexdigest()[:16]}{extension}"  # noqa: S324 - a file name
        if not default_storage.exists(name):
            name = default_storage.save(name, ContentFile(content))
        self.saved[url] = name
        return name

    def fetch(self, url):
        if url.startswith("/"):
            path = (settings.SEED_PUBLIC_DIR / url.lstrip("/")).resolve()
            if settings.SEED_PUBLIC_DIR.resolve() not in path.parents:
                raise OSError("outside frontend/public")
            return path.read_bytes(), path.suffix
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        kind = response.headers.get("Content-Type", "").split(";")[0]
        return response.content, mimetypes.guess_extension(kind) or ".jpg"

    def attach(self, obj, field, url, folder):
        """Put the downloaded file in obj.<field> unless it already has one. Returns True when obj changed."""
        if getattr(obj, field):
            return False
        name = self.stored_name(url, folder)
        if not name:
            return False
        setattr(obj, field, name)  # also reads the image size into the *_width / *_height fields
        return True


def replace_rows(model, parent_field, parent, rows):
    """A parent's row table = exactly these rows (in this order)."""
    model.objects.filter(**{parent_field: parent}).delete()
    model.objects.bulk_create([model(**{parent_field: parent}, sort_order=i, **row) for i, row in enumerate(rows)])


class Command(BaseCommand):
    help = "Load the frontend fixtures into the database, create the staff groups (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--no-images", action="store_true", help="Don't download the fixture photos.")
        parser.add_argument(
            "--if-empty", action="store_true", help="Do nothing when content exists (Docker runs this on every start)."
        )

    def handle(self, *args, **options):
        if options["if_empty"] and Fund.objects.exists():
            self.stdout.write("Content already loaded; seed skipped.")
            return
        files = Files(self, enabled=not options["no_images"])
        with transaction.atomic(), revalidate.paused():
            funds = self.seed_funds(files)
            self.seed_campaigns(files, funds)
            self.seed_programs(files, funds)
            categories = self.seed_posts(files)
            self.seed_gallery(files, categories)
            self.seed_organisation(files, funds)
            self.seed_settings(files)
            apply_groups()
            self.seed_superuser()
            # Gallery items and reports keep the fixture ids: move Postgres's id counters past them.
            with connection.cursor() as cursor:
                for sql in connection.ops.sequence_reset_sql(no_style(), [GalleryItem, Report]):
                    cursor.execute(sql)
            revalidate.revalidate_everything()

        counts = ", ".join(
            f"{model.objects.count()} {model._meta.verbose_name_plural}"
            for model in (Fund, Campaign, Program, Post, GalleryItem, Person, Report, Job, Page)
        )
        self.stdout.write(self.style.SUCCESS(f"Seeded {counts}, the site settings and the staff groups."))
        if files.failed:
            self.stdout.write(self.style.WARNING(f"{files.failed} image(s) could not be downloaded; run seed again."))

    # ---- content ------------------------------------------------------------------------------------------------

    def seed_funds(self, files):
        funds = {}
        for item in load("funds"):
            fund, _ = Fund.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    **texts(item, "title", "summary", "body"),
                    **alt(item.get("cover"), "cover_alt"),
                    "preset_amounts": item.get("preset_amounts") or [100, 200, 500, 1000],
                    "min_amount": item.get("min_amount", 10),
                    "is_zakat_eligible": bool(item.get("is_zakat_eligible")),
                    "is_fitra": bool(item.get("is_fitra")),
                    "allow_recurring": bool(item.get("allow_recurring", True)),
                    "sort_order": item.get("sort_order", 0),
                    "is_active": item.get("is_active", True),
                },
            )
            if files.attach(fund, "cover_image", (item.get("cover") or {}).get("url"), "funds"):
                fund.save()
            keys = ("bank", "account_name", "branch", "number", "routing", "swift")
            accounts = [{k: str(row.get(k) or "") for k in keys} for row in item.get("bank_details") or []]
            replace_rows(FundBankAccount, "fund", fund, accounts)
            funds[fund.slug] = fund
        return funds

    def seed_campaigns(self, files, funds):
        for item in load("campaigns"):
            fund = funds.get(item["fund"])
            if fund is None:
                raise CommandError(f"Campaign {item['slug']} names unknown fund {item['fund']}")
            defaults = {
                **texts(item, "title", "summary", "body"),
                **alt(item.get("cover"), "cover_alt"),
                "goal_amount": item["goal_amount"],
                "offline_raised": item.get("offline_raised", 0),
                "offline_donors": item.get("offline_donors", 0),
                "monthly_options": item.get("monthly_options") or [500, 1000, 2000],
                "highlighted_option": item.get("highlighted_option"),
                "ends_at": when(item.get("ends_at")),
                "fund": fund,
                "is_featured": bool(item.get("is_featured")),
                "is_active": item.get("is_active", True),
            }
            if item.get("starts_at"):
                defaults["starts_at"] = when(item["starts_at"])
            campaign, _ = Campaign.objects.update_or_create(slug=item["slug"], defaults=defaults)
            if files.attach(campaign, "cover_image", (item.get("cover") or {}).get("url"), "campaigns"):
                campaign.save()

    def seed_programs(self, files, funds):
        for item in load("programs"):
            program, _ = Program.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    **texts(item, "badge", "title", "summary", "body", "beneficiary", "area", "duration"),
                    **alt(item.get("cover"), "cover_alt"),
                    "fund": funds.get(item.get("fund")),
                    "is_featured": bool(item.get("is_featured")),
                    "sort_order": item.get("sort_order", 0),
                    "is_active": item.get("is_active", True),
                },
            )
            if files.attach(program, "cover_image", (item.get("cover") or {}).get("url"), "programs"):
                program.save()
            goals = [texts({"text": goal}, "text") for goal in item.get("goals") or []]
            faqs = [{**texts(f, "q"), **texts(f, "a")} for f in item.get("faq") or []]
            impacts = [{"year": i["year"], "value": i["value"], **texts(i, "metric")} for i in item.get("impact") or []]
            replace_rows(ProgramGoal, "program", program, goals)
            replace_rows(ProgramFaq, "program", program, faqs)
            replace_rows(ProgramImpact, "program", program, impacts)
            ProgramImage.objects.filter(program=program).delete()
            for order, image in enumerate(item.get("images") or []):
                row = ProgramImage(program=program, sort_order=order, **alt(image, "alt"))
                if files.attach(row, "image", image.get("url"), "programs"):
                    row.save()

    def seed_posts(self, files):
        data = load("posts")
        categories = {}
        for item in data["categories"]:
            category, _ = PostCategory.objects.update_or_create(
                slug=item["slug"], defaults={**texts(item, "name"), "sort_order": item.get("sort_order", 0)}
            )
            categories[category.slug] = category
        for item in data["posts"]:
            post, _ = Post.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    **texts(item, "title", "excerpt", "body"),
                    **alt(item.get("cover"), "cover_alt"),
                    "category": categories[item["category"]],
                    "published_at": when(item.get("published_at")),
                },
            )
            if files.attach(post, "cover_image", (item.get("cover") or {}).get("url"), "posts"):
                post.save()
        return categories

    def seed_gallery(self, files, categories):
        for item in load("gallery"):
            image = item.get("image") or {}
            entry, _ = GalleryItem.objects.update_or_create(
                pk=item["id"],
                defaults={
                    "kind": item.get("kind", "photo"),
                    "youtube_id": item.get("youtube_id") or "",
                    **alt(image, "alt"),
                    **texts(item, "caption"),
                    "category": categories[item["category"]],
                },
            )
            if files.attach(entry, "image", image.get("url"), "gallery"):
                entry.save()

    def seed_organisation(self, files, funds):
        for order, item in enumerate(load("people")):
            person, _ = Person.objects.update_or_create(
                name_bn=bilingual(item.get("name"))[0],
                defaults={
                    **texts(item, "role", "bio"),
                    "name_en": bilingual(item.get("name"))[1],
                    **alt(item.get("photo"), "photo_alt"),
                    "photo_consent": bool(item.get("photo_consent")),
                    "sort_order": item.get("sort_order", order),
                },
            )
            if files.attach(person, "photo", (item.get("photo") or {}).get("url"), "people"):
                person.save()

        for item in load("reports"):
            report, _ = Report.objects.update_or_create(
                pk=item["id"],
                defaults={
                    "kind": item["kind"],
                    "year": item.get("year"),
                    **texts(item, "title"),
                    "published_at": parse_date(item["published_at"]),
                },
            )
            if files.attach(report, "file", item.get("file_url"), "reports"):
                report.save()

        for order, item in enumerate(load("jobs")):
            Job.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    **texts(item, "title", "body", "location"),
                    "apply_email": item.get("apply_email") or "",
                    "apply_url": item.get("apply_url") or "",
                    "closes_at": parse_date(item["closes_at"]) if item.get("closes_at") else None,
                    "is_open": item.get("is_open", True),
                    "sort_order": order,
                },
            )

        for item in load("pages"):
            page, _ = Page.objects.update_or_create(slug=item["slug"], defaults=texts(item, "title", "body"))
            if item.get("updated_at"):  # keep the fixture's "last updated" date (auto_now would say today)
                Page.objects.filter(pk=page.pk).update(updated_at=parse_datetime(f"{item['updated_at']}T00:00:00Z"))

        for row in load("transparency").get("offline_totals") or []:
            if row["fund"] in funds:
                OfflineTotal.objects.update_or_create(
                    year=row["year"], fund=funds[row["fund"]], defaults={"total": row["total"]}
                )

    def seed_settings(self, files):
        data = load("site")
        site = SiteSettings.load()
        contact, quote = data.get("contact") or {}, data.get("quote") or {}
        registration, about = data.get("registration") or {}, data.get("about") or {}
        nisab, fitra = data.get("nisab") or {}, data.get("fitra") or {}
        for name, value in {
            **texts(contact, "address", "hours"),
            "phone": contact.get("phone") or "",
            "whatsapp": contact.get("whatsapp") or "",
            "email": contact.get("email") or "",
            "map_embed_url": contact.get("map_embed_url") or "",
            **{k: v or "" for k, v in (data.get("social") or {}).items()},
            **texts(quote, "text", prefix="quote_text"),
            **texts(quote, "source", prefix="quote_source"),
            **texts(registration, "authority", prefix="reg_authority"),
            "reg_number": registration.get("number") or "",
            "reg_date": parse_date(registration["date"]) if registration.get("date") else None,
            **texts(about, "mission", "vision"),
            "promo_youtube_id": (data.get("promo_video") or {}).get("youtube_id") or "",
            "zakat_enabled": bool(data.get("zakat_enabled")),
            "silver_price_per_gram": nisab.get("silver_price_per_gram") or 0,
            "gold_price_per_gram": nisab.get("gold_price_per_gram") or 0,
            "karat": nisab.get("karat") or "22K",
            "nisab_updated_at": when(nisab.get("updated_at")),
            "fitra_year": fitra.get("year"),
            "fitra_open": bool(fitra.get("open")),
            "fitra_cutoff": when(fitra.get("cutoff")),
            "pay_bkash": "bkash" in (data.get("payment_methods") or []),
            "pay_sslcommerz": "sslcommerz" in (data.get("payment_methods") or []),
        }.items():
            setattr(site, name, value)
        files.attach(site, "reg_certificate", registration.get("certificate_url"), "registration")
        site.save()

        stats = [
            {"value": s["value"], "suffix": s.get("suffix") or "", **texts(s, "label")} for s in data.get("stats") or []
        ]
        banking = [
            {"service": m["service"], "number": m.get("number") or "", "type": m.get("type") or "merchant"}
            for m in data.get("mobile_banking") or []
        ]
        rates = [{"amount": r.get("amount") or 0, **texts(r, "item")} for r in fitra.get("rates") or []]
        faqs = [{**texts(f, "q"), **texts(f, "a")} for f in data.get("contact_faq") or []]
        replace_rows(Stat, "settings", site, stats)
        replace_rows(MobileBankingAccount, "settings", site, banking)
        replace_rows(FitraRate, "settings", site, rates)
        replace_rows(ContactFaq, "settings", site, faqs)

        slots = list(HomeImage.Slot.values)
        for slot, image in (data.get("home_images") or {}).items():
            if slot not in slots:
                continue
            row = HomeImage.objects.filter(slot=slot).first() or HomeImage(slot=slot, sort_order=slots.index(slot))
            for name, value in alt(image, "alt").items():
                setattr(row, name, value)
            files.attach(row, "image", (image or {}).get("url"), "home")
            if row.image:
                row.save()

    def seed_superuser(self):
        if settings.SEED_ADMIN_EMAIL and settings.SEED_ADMIN_PASSWORD:
            email = settings.SEED_ADMIN_EMAIL.lower()
            if not User.objects.filter(email=email).exists():
                User.objects.create_superuser(email=email, password=settings.SEED_ADMIN_PASSWORD)
                self.stdout.write("Created the first superuser.")
