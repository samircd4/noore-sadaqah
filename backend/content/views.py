"""
Public content endpoints (docs/API.md "Public content"). Read only, no login, cached 60 seconds by browsers and
proxies; Next.js caches them by tag and is told when staff change something (core/revalidate.py).
"""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from core.api import number, paginate, public
from core.markdown import to_html
from core.utils import request_language, translated

from . import docs, output
from .models import Campaign, Fund, GalleryItem, Job, Page, Person, Post, PostCategory, Program, Report


@docs.site
@api_view(["GET"])
@public
def site(request):
    return Response(output.site_json(request_language(request)))


# ---- funds ------------------------------------------------------------------------------------------------------


def active_funds():
    return Fund.objects.filter(is_active=True).prefetch_related("bank_accounts")


@docs.funds
@api_view(["GET"])
@public
def funds(request):
    lang = request_language(request)
    return Response([output.fund_json(f, lang) for f in active_funds()])


@docs.fund
@api_view(["GET"])
@public
def fund(request, slug):
    return Response(output.fund_json(get_object_or_404(active_funds(), slug=slug), request_language(request), True))


# ---- programs ---------------------------------------------------------------------------------------------------


def active_programs():
    return Program.objects.filter(is_active=True).select_related("fund")


@docs.programs
@api_view(["GET"])
@public
def programs(request):
    lang = request_language(request)
    queryset = active_programs()
    if request.query_params.get("featured") in ("1", "true"):
        queryset = queryset.filter(is_featured=True)
    return Response([output.program_json(p, lang) for p in queryset])


@docs.program
@api_view(["GET"])
@public
def program(request, slug):
    lang = request_language(request)
    queryset = active_programs().prefetch_related("goals", "faqs", "impacts", "images")
    found = get_object_or_404(queryset, slug=slug)
    related = active_programs().exclude(pk=found.pk)[:3]
    return Response(output.program_detail_json(found, related, lang))


# ---- campaigns --------------------------------------------------------------------------------------------------


def active_campaigns():
    return Campaign.objects.filter(is_active=True, starts_at__lte=timezone.now()).select_related("fund")


@docs.campaigns
@api_view(["GET"])
@public
def campaigns(request):
    lang = request_language(request)
    queryset = active_campaigns()
    if request.query_params.get("featured") in ("1", "true"):
        queryset = queryset.filter(is_featured=True)
    return Response([output.campaign_json(c, lang) for c in queryset])


@docs.campaign
@api_view(["GET"])
@public
def campaign(request, slug):
    return Response(output.campaign_json(get_object_or_404(active_campaigns(), slug=slug), request_language(request)))


# ---- news -------------------------------------------------------------------------------------------------------


def published_posts():
    """Drafts (no date) and scheduled posts (a date in the future) are not public."""
    return Post.objects.filter(published_at__lte=timezone.now()).select_related("category").order_by("-published_at")


@docs.post_categories
@api_view(["GET"])
@public
def post_categories(request):
    lang = request_language(request)
    return Response([output.category_json(c, lang) for c in PostCategory.objects.all()])


@docs.posts
@api_view(["GET"])
@public
def posts(request):
    lang = request_language(request)
    queryset = published_posts()
    if category := request.query_params.get("category"):
        queryset = queryset.filter(category__slug=category)
    return Response(paginate(queryset, request, lambda p: output.post_json(p, lang)))


@docs.post
@api_view(["GET"])
@public
def post(request, slug):
    lang = request_language(request)
    found = get_object_or_404(published_posts(), slug=slug)
    related = published_posts().exclude(pk=found.pk)[:3]
    return Response({**output.post_json(found, lang, True), "related": [output.post_json(p, lang) for p in related]})


@docs.gallery
@api_view(["GET"])
@public
def gallery(request):
    lang = request_language(request)
    queryset = GalleryItem.objects.filter(is_published=True).select_related("category")
    if category := request.query_params.get("category"):
        queryset = queryset.filter(category__slug=category)
    if (kind := request.query_params.get("kind")) in GalleryItem.Kind.values:
        queryset = queryset.filter(kind=kind)
    return Response(paginate(queryset, request, lambda g: output.gallery_json(g, lang)))


# ---- the organisation -------------------------------------------------------------------------------------------


@docs.people
@api_view(["GET"])
@public
def people(request):
    lang = request_language(request)
    return Response([output.person_json(p, lang) for p in Person.objects.filter(is_active=True)])


@docs.reports
@api_view(["GET"])
@public
def reports(request):
    lang = request_language(request)
    queryset = Report.objects.all()
    if (kind := request.query_params.get("kind")) in Report.Kind.values:
        queryset = queryset.filter(kind=kind)
    if year := number(request.query_params.get("year")):
        queryset = queryset.filter(year=year)
    return Response([output.report_json(r, lang) for r in queryset])


@docs.jobs
@api_view(["GET"])
@public
def jobs(request):
    """Open vacancies; one closing today is still open until the day ends in Dhaka."""
    lang = request_language(request)
    today = timezone.localdate()
    queryset = Job.objects.filter(is_open=True).exclude(closes_at__lt=today)
    return Response([output.job_json(j, lang) for j in queryset])


@docs.page
@api_view(["GET"])
@public
def page(request, slug):
    lang = request_language(request)
    found = get_object_or_404(Page, slug=slug)
    return Response(
        {
            "slug": found.slug,
            "title": translated(found, "title", lang),
            "body_html": to_html(translated(found, "body", lang)),
            "updated_at": timezone.localdate(found.updated_at).isoformat(),
        }
    )


@docs.transparency
@api_view(["GET"])
@public
def transparency_totals(request):
    from donations.reports import yearly_totals

    return Response({"years": yearly_totals(request_language(request))})
