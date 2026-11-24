"""
Contract test (docs/TESTING.md): every content endpoint answers with the same keys and value types as the frontend
mock builds from frontend/src/mocks/fixtures, so switching API_LIVE_GROUPS=content changes nothing in the pages.

The reference shapes below follow the mock handlers (frontend/src/mocks/routes/content.js and org.js): the fixture
item, language-resolved, with fixture-only keys removed. A None on either side matches anything (an image that
wasn't downloaded in tests, a fund with no bank account yet).
"""

import json

import pytest
from django.conf import settings

pytestmark = pytest.mark.usefixtures("seeded")


def fixture(name):
    return json.loads((settings.SEED_FIXTURES_DIR / f"{name}.json").read_text(encoding="utf-8"))


def localize(value):
    """The mock's localize() + clean(): {bn, en} → the Bengali text, "_" keys dropped."""
    if isinstance(value, list):
        return [localize(v) for v in value]
    if isinstance(value, dict):
        if value and set(value) <= {"bn", "en"} and "bn" in value:
            return value["bn"]
        return {k: localize(v) for k, v in value.items() if not k.startswith("_")}
    return value


def pick(item, *keys):
    return {k: item.get(k) for k in keys}


def same_shape(actual, expected, path="$"):
    """Same keys at every level, same JSON type for every value (int/str/bool/list/object)."""
    if actual is None or expected is None:
        return
    if isinstance(expected, dict):
        assert isinstance(actual, dict), f"{path}: expected an object"
        assert set(actual) == set(expected), f"{path}: keys {sorted(actual)} != {sorted(expected)}"
        for key in expected:
            same_shape(actual[key], expected[key], f"{path}.{key}")
    elif isinstance(expected, list):
        assert isinstance(actual, list), f"{path}: expected a list"
        if expected and actual:
            same_shape(actual[0], expected[0], f"{path}[0]")
    elif isinstance(expected, bool):
        assert isinstance(actual, bool), f"{path}: expected a boolean, got {actual!r}"
    elif isinstance(expected, int):
        assert isinstance(actual, int) and not isinstance(actual, bool), f"{path}: expected a number, got {actual!r}"
    else:
        assert isinstance(actual, type(expected)), f"{path}: expected {type(expected).__name__}, got {actual!r}"


def get(api, path):
    response = api.get(f"/api/v1{path}", HTTP_ACCEPT_LANGUAGE="bn")
    assert response.status_code == 200, path
    return response.json()


def fund_ref(slug):
    return {"slug": slug, "title": "x"}


IMAGE = {"url": "x", "alt": "x", "width": 1, "height": 1}
BANK = {"bank": "", "account_name": "", "branch": "", "number": "", "routing": "", "swift": ""}


def test_site(api):
    expected = localize(fixture("site"))
    same_shape(get(api, "/site/"), expected)


def test_funds(api):
    item = localize(fixture("funds")[0])
    keys = ("slug", "title", "summary", "cover", "preset_amounts", "min_amount", "is_zakat_eligible", "is_fitra",
            "allow_recurring", "bank_details")  # fmt: skip
    expected = {**pick(item, *keys), "bank_details": [BANK]}
    same_shape(get(api, "/funds/")[0], expected)
    same_shape(get(api, f"/funds/{item['slug']}/"), {**expected, "body_html": "x"})


def test_programs(api):
    item = localize(fixture("programs")[0])
    summary = {**pick(item, "slug", "badge", "title", "summary", "cover"), "fund": fund_ref("x")}
    same_shape(get(api, "/programs/")[0], summary)
    detail = {
        **summary,
        **pick(item, "goals", "beneficiary", "area", "duration", "faq", "impact"),
        "images": [IMAGE],
        "body_html": "x",
        "fund": {"slug": "x", "title": "x", "preset_amounts": [1]},
        "related": [summary],
    }
    same_shape(get(api, f"/programs/{item['slug']}/"), detail)


def test_campaigns(api):
    item = localize(fixture("campaigns")[0])
    expected = {
        **pick(item, "slug", "title", "summary", "cover", "goal_amount", "monthly_options", "highlighted_option",
               "starts_at", "ends_at"),
        "body_html": "x", "raised_amount": 1, "percent": 1, "donor_count": 1, "is_ended": False,
        "fund": fund_ref("x"), "recent_donors": [{"name": "x", "amount": 1, "paid_at": "x"}],
    }  # fmt: skip
    same_shape(get(api, "/campaigns/")[0], expected)
    same_shape(get(api, f"/campaigns/{item['slug']}/"), expected)


def test_posts(api):
    data = fixture("posts")
    item = localize(data["posts"][0])
    summary = {
        **pick(item, "slug", "title", "excerpt", "cover", "published_at"),
        "category": {"slug": "x", "name": "x"},
    }
    page = {"count": 1, "page": 1, "pages": 1, "results": [summary]}
    same_shape(get(api, "/posts/"), page)
    slug = get(api, "/posts/")["results"][0]["slug"]
    same_shape(get(api, f"/posts/{slug}/"), {**summary, "body_html": "x", "related": [summary]})
    same_shape(get(api, "/post-categories/"), [{"slug": "x", "name": "x"}])


def test_gallery(api):
    item = localize(fixture("gallery")[0])
    expected = {**pick(item, "id", "kind", "image", "youtube_id", "caption"), "category": {"slug": "x", "name": "x"}}
    same_shape(get(api, "/gallery/"), {"count": 1, "page": 1, "pages": 1, "results": [expected]})


def test_people_reports_jobs_pages(api):
    person = localize(fixture("people")[0])
    same_shape(get(api, "/people/")[0], {**pick(person, "name", "role", "bio"), "photo": IMAGE})

    report = localize(fixture("reports")[0])
    same_shape(get(api, "/reports/")[0], pick(report, "id", "kind", "year", "title", "file_url", "published_at"))

    job = localize(fixture("jobs")[0])
    keys = ("slug", "title", "location", "apply_email", "apply_url", "closes_at")
    same_shape(get(api, "/jobs/")[0], {**pick(job, *keys), "body_html": "x"})

    page = localize(fixture("pages")[0])
    same_shape(get(api, f"/pages/{page['slug']}/"), {**pick(page, "slug", "title", "updated_at"), "body_html": "x"})


def test_transparency(api):
    expected = {"years": [{"year": 1, "funds": [{"slug": "x", "title": "x", "total": 1, "is_zakat": False}],
                           "total": 1}]}  # fmt: skip
    body = get(api, "/transparency/totals/")
    assert body["years"], "the seeded offline totals should show up"
    same_shape(body, expected)
