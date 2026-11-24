"""
Form endpoints (docs/API.md "Forms"): contact message, volunteer sign-up, newsletter subscribe and unsubscribe.
All share one throttle: 5 posts per visitor IP in 10 minutes.
"""

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response

from core.api import FormsThrottle
from core.utils import request_language

from .models import ContactMessage, Subscriber, Volunteer
from .serializers import ContactSerializer, SubscriberSerializer, UnsubscribeSerializer, VolunteerSerializer

CREATED = {201: {"type": "object", "properties": {}}}


@extend_schema(tags=["Forms"], summary="Send a message from /contact", request=ContactSerializer, responses=CREATED)
@api_view(["POST"])
@throttle_classes([FormsThrottle])
def contact(request):
    form = ContactSerializer(data=request.data)
    form.is_valid(raise_exception=True)
    ContactMessage.objects.create(**form.validated_data)
    return Response({}, status=201)


@extend_schema(tags=["Forms"], summary="Sign up as a volunteer", request=VolunteerSerializer, responses=CREATED)
@api_view(["POST"])
@throttle_classes([FormsThrottle])
def volunteer(request):
    form = VolunteerSerializer(data=request.data)
    form.is_valid(raise_exception=True)
    Volunteer.objects.create(**form.validated_data)
    return Response({}, status=201)


@extend_schema(
    tags=["Forms"],
    summary="Subscribe to the newsletter",
    description="An email that is already subscribed also gets 201, so nobody can test who is on the list.",
    request=SubscriberSerializer,
    responses=CREATED,
)
@api_view(["POST"])
@throttle_classes([FormsThrottle])
def subscribe(request):
    form = SubscriberSerializer(data=request.data)
    form.is_valid(raise_exception=True)
    email, locale = form.validated_data["email"], request_language(request)  # newsletters in the page language
    subscriber, created = Subscriber.objects.get_or_create(email=email, defaults={"locale": locale})
    if not created and subscriber.unsubscribed_at:  # coming back after unsubscribing
        subscriber.unsubscribed_at = None
        subscriber.locale = locale
        subscriber.save(update_fields=["unsubscribed_at", "locale", "updated_at"])
    return Response({}, status=201)


@extend_schema(
    tags=["Forms"],
    summary="Unsubscribe with the token from a newsletter email",
    description="Answers 200 for any token, so tokens can't be tested.",
    request=UnsubscribeSerializer,
    responses={200: {"type": "object", "properties": {}}},
)
@api_view(["POST"])
@throttle_classes([FormsThrottle])
def unsubscribe(request):
    form = UnsubscribeSerializer(data=request.data)
    form.is_valid(raise_exception=True)
    Subscriber.objects.filter(unsubscribe_token=form.validated_data["token"], unsubscribed_at__isnull=True).update(
        unsubscribed_at=timezone.now()
    )
    return Response({}, status=200)
