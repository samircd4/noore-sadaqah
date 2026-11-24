"""
What /api/docs/ shows for the content endpoints. These serializers only describe the answers (content/output.py
builds them); docs/API.md stays the contract.
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers as s

LANGUAGE = OpenApiParameter(
    "Accept-Language", str, OpenApiParameter.HEADER, enum=["bn", "en"], description="bn (default) or en"
)
PAGE = OpenApiParameter("page", int, description="Page number, 12 items a page")
LIMIT = OpenApiParameter("limit", int, description="One page of this many items (e.g. 6 on the home page)")
FEATURED = OpenApiParameter("featured", int, enum=[1], description="1 = only the ones on the home page")


class Image(s.Serializer):
    url = s.CharField()
    alt = s.CharField()
    width = s.IntegerField()
    height = s.IntegerField()


class FundRef(s.Serializer):
    slug = s.CharField()
    title = s.CharField()


class BankAccount(s.Serializer):
    bank = s.CharField()
    account_name = s.CharField()
    branch = s.CharField()
    number = s.CharField()
    routing = s.CharField()
    swift = s.CharField()


class FundItem(s.Serializer):
    slug = s.CharField()
    title = s.CharField()
    summary = s.CharField()
    cover = Image(allow_null=True)
    preset_amounts = s.ListField(child=s.IntegerField())
    min_amount = s.IntegerField()
    is_zakat_eligible = s.BooleanField()
    is_fitra = s.BooleanField()
    allow_recurring = s.BooleanField()
    bank_details = BankAccount(many=True)


class FundDetail(FundItem):
    body_html = s.CharField()


class ProgramItem(s.Serializer):
    slug = s.CharField()
    badge = s.CharField()
    title = s.CharField()
    summary = s.CharField()
    cover = Image(allow_null=True)
    fund = FundRef(allow_null=True)


class QA(s.Serializer):
    q = s.CharField()
    a = s.CharField()


class Impact(s.Serializer):
    year = s.IntegerField()
    metric = s.CharField()
    value = s.IntegerField()


class ProgramFund(FundRef):
    preset_amounts = s.ListField(child=s.IntegerField())


class ProgramDetail(ProgramItem):
    body_html = s.CharField()
    goals = s.ListField(child=s.CharField())
    beneficiary = s.CharField()
    area = s.CharField()
    duration = s.CharField()
    faq = QA(many=True)
    impact = Impact(many=True)
    images = Image(many=True)
    fund = ProgramFund(allow_null=True)
    related = ProgramItem(many=True)


class RecentDonor(s.Serializer):
    name = s.CharField(allow_null=True, help_text="First name only; null when the donor is anonymous")
    amount = s.IntegerField()
    paid_at = s.DateTimeField()


class Campaign(s.Serializer):
    slug = s.CharField()
    title = s.CharField()
    summary = s.CharField()
    body_html = s.CharField()
    cover = Image(allow_null=True)
    goal_amount = s.IntegerField()
    raised_amount = s.IntegerField()
    percent = s.IntegerField()
    donor_count = s.IntegerField()
    monthly_options = s.ListField(child=s.IntegerField())
    highlighted_option = s.IntegerField(allow_null=True)
    starts_at = s.DateTimeField()
    ends_at = s.DateTimeField(allow_null=True)
    is_ended = s.BooleanField()
    fund = FundRef()
    recent_donors = RecentDonor(many=True)


class Category(s.Serializer):
    slug = s.CharField()
    name = s.CharField()


class PostItem(s.Serializer):
    slug = s.CharField()
    title = s.CharField()
    excerpt = s.CharField()
    cover = Image(allow_null=True)
    category = Category()
    published_at = s.DateTimeField()


class PostDetail(PostItem):
    body_html = s.CharField()
    related = PostItem(many=True)


class GalleryItem(s.Serializer):
    id = s.IntegerField()
    kind = s.ChoiceField(["photo", "video"])
    image = Image()
    youtube_id = s.CharField()
    caption = s.CharField()
    category = Category()


def page_of(item, name):
    return type(name, (s.Serializer,), {
        "count": s.IntegerField(), "page": s.IntegerField(), "pages": s.IntegerField(), "results": item(many=True),
    })  # fmt: skip


class Person(s.Serializer):
    name = s.CharField()
    role = s.CharField()
    bio = s.CharField()
    photo = Image(allow_null=True, help_text="null unless the person consented to their photo being shown")


class Report(s.Serializer):
    id = s.IntegerField()
    kind = s.ChoiceField(["annual", "audit", "registration", "other"])
    year = s.IntegerField(allow_null=True)
    title = s.CharField()
    file_url = s.CharField()
    published_at = s.DateField()


class Job(s.Serializer):
    slug = s.CharField()
    title = s.CharField()
    location = s.CharField()
    body_html = s.CharField()
    apply_email = s.CharField()
    apply_url = s.CharField()
    closes_at = s.DateField(allow_null=True)


class PageOut(s.Serializer):
    slug = s.CharField()
    title = s.CharField()
    body_html = s.CharField()
    updated_at = s.DateField()


class FundTotal(s.Serializer):
    slug = s.CharField()
    title = s.CharField()
    total = s.IntegerField()
    is_zakat = s.BooleanField()


class YearTotal(s.Serializer):
    year = s.IntegerField()
    funds = FundTotal(many=True)
    total = s.IntegerField()


class Transparency(s.Serializer):
    years = YearTotal(many=True)


class Stat(s.Serializer):
    value = s.IntegerField()
    suffix = s.CharField()
    label = s.CharField()


class Site(s.Serializer):
    stats = Stat(many=True)
    contact = s.DictField(help_text="address, phone, whatsapp, email, hours, map_embed_url")
    social = s.DictField(help_text="facebook, youtube, instagram, linkedin")
    quote = s.DictField(help_text="text, source")
    registration = s.DictField(help_text="authority, number, date, certificate_url")
    mobile_banking = s.ListField(child=s.DictField(), help_text="[{service, number, type}]")
    payment_methods = s.ListField(child=s.CharField(), help_text="Online methods that work right now")
    promo_video = s.DictField(help_text="youtube_id")
    nisab = s.DictField(help_text="silver_price_per_gram, gold_price_per_gram, karat, updated_at")
    fitra = s.DictField(help_text="year, rates [{item, amount}], cutoff, open")
    zakat_enabled = s.BooleanField()
    home_images = s.DictField(child=Image(allow_null=True), help_text="hero, about_main, about_small, quote, …")
    about = s.DictField(help_text="mission, vision")
    contact_faq = QA(many=True)


def doc(summary, response, *parameters, tag="Content", description="", operation_id=None):
    return extend_schema(
        operation_id=operation_id,
        summary=summary,
        description=description,
        tags=[tag],
        parameters=[LANGUAGE, *parameters],
        responses={200: response},
    )


site = doc("Everything the page layout needs", Site, tag="Site", description="One call per page render (cached).")
funds = doc("Active funds, in display order", FundItem(many=True), tag="Funds")
fund = doc("One fund, with its story", FundDetail, tag="Funds")
programs = doc("Programs", ProgramItem(many=True), FEATURED, tag="Programs")
program = doc("One program, with goals, FAQ, impact, photos and 3 related programs", ProgramDetail, tag="Programs")
campaigns = doc("Campaigns, with the money raised so far", Campaign(many=True), FEATURED, tag="Campaigns")
campaign = doc("One campaign", Campaign, tag="Campaigns", description="Totals count PAID donations (cached 60 s).")
post_categories = doc("News categories (also used by the gallery)", Category(many=True), tag="News")
posts = doc(
    "Published news, newest first",
    page_of(PostItem, "PostPage"),
    OpenApiParameter("category", str, description="Category slug"),
    PAGE,
    LIMIT,
    tag="News",
    operation_id="posts_list",
)
post = doc("One news post, with 3 related posts", PostDetail, tag="News", description="Drafts answer 404.")
gallery = doc(
    "Gallery photos and videos",
    page_of(GalleryItem, "GalleryPage"),
    OpenApiParameter("category", str, description="Category slug"),
    OpenApiParameter("kind", str, enum=["photo", "video"]),
    PAGE,
    LIMIT,
    tag="Gallery",
    operation_id="gallery_list",
)
people = doc("Board members and advisors", Person(many=True), tag="Organisation")
reports = doc(
    "Public reports (PDF), newest first",
    Report(many=True),
    OpenApiParameter("kind", str, enum=["annual", "audit", "registration", "other"]),
    OpenApiParameter("year", int),
    tag="Organisation",
)
jobs = doc("Open vacancies", Job(many=True), tag="Organisation")
page = doc(
    "A long text page",
    PageOut,
    tag="Organisation",
    description="privacy, terms, refund-policy, about, how-we-spend. Unknown slug → 404.",
)
transparency = doc(
    "Money received per year and fund", Transparency, tag="Organisation", description="Zakat funds listed last."
)
