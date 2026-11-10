from django.contrib import admin
from django.urls import include, path

from core.views import health
from donations.views import download_receipt

api = [
    path("health/", health, name="health"),
    path("donations/", include("donations.urls")),
    path("payments/", include("payments.urls")),
    path("receipts/<str:token>/", download_receipt),  # the same receipt, for links in emails
]

urlpatterns = [
    path("api/v1/", include(api)),
    path("admin/", admin.site.urls),
    path("r/<str:token>", download_receipt),  # short receipt link sent by SMS (docs/API.md "Receipts")
]
