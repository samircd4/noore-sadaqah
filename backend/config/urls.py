from django.contrib import admin
from django.urls import include, path

from core.views import health

api = [
    path("health/", health, name="health"),
    path("donations/", include("donations.urls")),
    path("payments/", include("payments.urls")),
]

urlpatterns = [
    path("api/v1/", include(api)),
    path("admin/", admin.site.urls),
]
