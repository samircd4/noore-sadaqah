"""Form endpoints (docs/API.md "Forms"): same rules and error codes as frontend/src/lib/validation/forms.js."""

import pytest

from engagement.models import ContactMessage, Subscriber, Volunteer

pytestmark = pytest.mark.django_db


def post(api, path, body, ip="203.0.113.5"):
    return api.post(f"/api/v1{path}", body, format="json", HTTP_X_FORWARDED_FOR=ip)


def fields(response):
    assert response.status_code == 400, response.content
    return response.json()["error"]["fields"]


class TestContact:
    body = {"name": "রহিম", "contact": "+880 1712-345678", "subject": "দান", "message": "আসসালামু আলাইকুম"}

    def test_saves_with_normalised_phone(self, api):
        assert post(api, "/contact/", self.body).status_code == 201
        assert ContactMessage.objects.get().contact == "01712345678"

    def test_email_is_lower_cased(self, api):
        post(api, "/contact/", {**self.body, "contact": "Rahim@Example.COM"})
        assert ContactMessage.objects.get().contact == "rahim@example.com"

    @pytest.mark.parametrize(
        ("change", "field", "code"),
        [
            ({"contact": "hello"}, "contact", "contactInvalid"),
            ({"name": ""}, "name", "required"),
            ({"message": "x" * 2001}, "message", "tooLong"),
            ({"subject": "x" * 151}, "subject", "tooLong"),
        ],
    )
    def test_errors(self, api, change, field, code):
        assert fields(post(api, "/contact/", {**self.body, **change}))[field] == [code]
        assert not ContactMessage.objects.exists()


class TestVolunteer:
    body = {"name": "করিম", "phone": "01812345678", "district": "gazipur", "availability": "weekends"}

    def test_saves(self, api):
        assert post(api, "/volunteers/", self.body).status_code == 201
        volunteer = Volunteer.objects.get()
        assert (volunteer.district, volunteer.availability, volunteer.email) == ("gazipur", "weekends", "")

    @pytest.mark.parametrize(
        ("change", "field", "code"),
        [
            ({"district": "atlantis"}, "district", "districtInvalid"),
            ({"district": ""}, "district", "required"),
            ({"phone": "12345"}, "phone", "mobileInvalid"),
            ({"email": "not-an-email"}, "email", "emailInvalid"),
            ({"availability": "nights"}, "availability", "choiceInvalid"),
            ({"skills": "x" * 501}, "skills", "tooLong"),
        ],
    )
    def test_errors(self, api, change, field, code):
        assert fields(post(api, "/volunteers/", {**self.body, **change}))[field] == [code]


class TestSubscribers:
    def test_subscribing_twice_gives_201_and_one_row(self, api):
        assert post(api, "/subscribers/", {"email": "A@Example.com"}).status_code == 201
        assert post(api, "/subscribers/", {"email": "a@example.com"}).status_code == 201
        assert Subscriber.objects.get().email == "a@example.com"

    def test_language_comes_from_the_page(self, api):
        api.post("/api/v1/subscribers/", {"email": "b@example.com"}, format="json", HTTP_ACCEPT_LANGUAGE="en")
        assert Subscriber.objects.get().locale == "en"

    def test_unsubscribe(self, api):
        post(api, "/subscribers/", {"email": "c@example.com"})
        subscriber = Subscriber.objects.get()
        assert post(api, "/subscribers/unsubscribe/", {"token": subscriber.unsubscribe_token}).status_code == 200
        subscriber.refresh_from_db()
        assert subscriber.unsubscribed_at is not None

    def test_unknown_token_looks_the_same(self, api):
        assert post(api, "/subscribers/unsubscribe/", {"token": "nope"}).status_code == 200

    def test_resubscribing_clears_the_unsubscribe(self, api):
        post(api, "/subscribers/", {"email": "d@example.com"})
        subscriber = Subscriber.objects.get()
        post(api, "/subscribers/unsubscribe/", {"token": subscriber.unsubscribe_token})
        post(api, "/subscribers/", {"email": "d@example.com"})
        subscriber.refresh_from_db()
        assert subscriber.unsubscribed_at is None


def test_all_forms_share_one_throttle(api):
    """5 posts per IP in 10 minutes across contact, volunteer and newsletter (API.md "Throttles")."""
    for i in range(5):
        assert post(api, "/subscribers/", {"email": f"t{i}@example.com"}).status_code == 201
    blocked = post(api, "/contact/", TestContact.body)
    assert blocked.status_code == 429 and blocked.json()["error"]["code"] == "throttled"
    assert post(api, "/contact/", TestContact.body, ip="198.51.100.7").status_code == 201
