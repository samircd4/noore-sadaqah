"""Small pieces every public endpoint uses: the cache header, the per-IP throttle and the pagination shape."""

import functools
import math

from django.http import Http404
from rest_framework.throttling import SimpleRateThrottle

from .utils import client_ip

PAGE_SIZE = 12  # API.md "Pagination"


def public(view):
    """Public GETs: `Cache-Control: public, max-age=60` (API.md "Caching")."""

    @functools.wraps(view)
    def wrapper(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        if response.status_code == 200:
            response["Cache-Control"] = "public, max-age=60"
        return response

    return wrapper


class FormsThrottle(SimpleRateThrottle):
    """5 form posts per visitor IP in 10 minutes, shared by contact, volunteer and newsletter (API.md "Throttles")."""

    rate = "5 per 10 minutes"

    def parse_rate(self, rate):
        return 5, 10 * 60

    def get_cache_key(self, request, view):
        return f"throttle_forms_{client_ip(request)}"


def number(text):
    """A positive whole number from a query string, or None."""
    text = str(text or "")
    # isascii(): "²" and "١" pass isdigit() but int() can't read them
    return int(text) if text.isascii() and text.isdigit() and int(text) > 0 else None


def paginate(queryset, request, to_json):
    """{count, page, pages, results}: 12 a page with ?page=N, or one page of ?limit=N. A page past the end is 404.
    Only the rows of the asked page are loaded and turned into JSON."""
    size = min(number(request.query_params.get("limit")) or PAGE_SIZE, 100)
    page = number(request.query_params.get("page")) or 1
    count = queryset.count()
    pages = max(1, math.ceil(count / size))
    if page > pages:
        raise Http404
    rows = queryset[(page - 1) * size : page * size]
    return {"count": count, "page": page, "pages": pages, "results": [to_json(row) for row in rows]}
