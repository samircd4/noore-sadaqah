from django.urls import path

from . import views

urlpatterns = [
    path("contact/", views.contact),
    path("volunteers/", views.volunteer),
    path("subscribers/", views.subscribe),
    path("subscribers/unsubscribe/", views.unsubscribe),
]
