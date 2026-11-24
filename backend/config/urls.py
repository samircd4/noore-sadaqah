from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAdminUser

from core.views import health
from donations.views import download_receipt

api = [
    path("health/", health, name="health"),
    path("", include("content.urls")),
    path("", include("engagement.urls")),
    path("donations/", include("donations.urls")),
    path("payments/", include("payments.urls")),
    path("receipts/<str:token>/", download_receipt),  # the same receipt, for links in emails
]

# API docs: open to anyone in development; on the server only to staff logged in to /admin/ (API.md "Internal").
docs_access = {
    "authentication_classes": [SessionAuthentication],
    "permission_classes": [AllowAny if settings.DEBUG else IsAdminUser],
}

urlpatterns = [
    path("api/v1/", include(api)),
    path("api/schema/", SpectacularAPIView.as_view(**docs_access), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema", **docs_access), name="api-docs"),
    path("admin/", admin.site.urls),
    path("r/<str:token>", download_receipt),  # short receipt link sent by SMS (docs/API.md "Receipts")
]

if settings.DEBUG and settings.MEDIA_URL.startswith("/"):  # uploaded files; production serves them from R2
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
