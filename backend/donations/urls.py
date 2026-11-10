from django.urls import path

from . import views

urlpatterns = [
    path("", views.create_donation),
    path("<uuid:donation_id>/status/", views.donation_status),
    path("<uuid:donation_id>/refresh/", views.refresh_donation),
]
