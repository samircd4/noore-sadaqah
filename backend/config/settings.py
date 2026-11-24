"""
All Django settings in one file. Secrets and per-machine values come from backend/.env (never committed);
see .env.example. Locally DJANGO_DEBUG=true; on the server it is false.
"""

import os
import secrets
import sys
from pathlib import Path

from celery.schedules import crontab
from django.templatetags.static import static
from django.urls import reverse, reverse_lazy
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
TESTING = "pytest" in sys.modules

load_dotenv(BASE_DIR / ".env")  # puts the values from backend/.env into os.environ


def env_bool(name, default="false"):
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes")


def env_list(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


DEBUG = env_bool("DJANGO_DEBUG")
# Every secret comes from backend/.env. Only pytest makes throwaway random ones, so tests run without a .env.
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY") or (secrets.token_urlsafe(50) if TESTING else None)
if not SECRET_KEY:
    raise RuntimeError("Set DJANGO_SECRET_KEY in backend/.env (see .env.example for the command).")
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
# Pages that may post forms to Django, such as the admin login through the Next.js dev server on port 3000.
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

INSTALLED_APPS = [
    "unfold",  # admin theme (DECISIONS.md D4); must come before django.contrib.admin
    "unfold.contrib.forms",  # list widgets such as the preset amounts row
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    "rest_framework",
    "drf_spectacular",  # /api/docs/
    "core",
    "accounts",
    "content",
    "donations",
    "payments",
    "notifications",
    "engagement",
    "audit",
    "django_celery_beat",  # production beat reads the schedule from the database (DEPLOYMENT.md)
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],  # emails/*.html (receipts/ lives in the donations app)
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Local Postgres and Redis come from docker-compose.dev.yml.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "noore"),
        "USER": os.getenv("DB_USER", "noore"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0"),
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# The Django admin is in English. The API picks Bengali or English per request (core/utils.py), not from this.
# Dates are stored in UTC and shown in Asia/Dhaka.
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Dhaka"
USE_I18N = True
USE_TZ = True

STATIC_URL = "dj-static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# The foundation's logo (the same file as frontend/public/brand/logo-256.png, also used on receipts) for the admin.
STATICFILES_DIRS = [("brand", BASE_DIR / "static" / "receipts")]
# Uploaded images and PDFs. In development Django serves them at /media/ (the Next.js dev server forwards that path);
# in production MEDIA_URL is the R2 public address, e.g. https://media.nooresadaqah.org/ (DEPLOYMENT.md).
MEDIA_URL = os.getenv("MEDIA_URL", "/media/")
MEDIA_ROOT = BASE_DIR / "media"
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    # Donor login (JWT) comes in phase B3. No session login on the API, so the Next.js server needs no CSRF token.
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "UNAUTHENTICATED_USER": None,
    # Errors in the shape the frontend expects: {"error": {"code": ..., "fields": ...}} (docs/API.md)
    "EXCEPTION_HANDLER": "core.errors.api_error_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# Browsable API docs at /api/docs/ (Swagger UI) and the OpenAPI file at /api/schema/. Open to anyone while
# DJANGO_DEBUG=true; on the server only to staff logged in to /admin/ (config/urls.py).
SPECTACULAR_SETTINGS = {
    "TITLE": "Noore Sadaqah Foundation API",
    "DESCRIPTION": (
        "The contract between the Next.js website and Django (docs/API.md is the source of truth). "
        "Content endpoints answer in the language of the Accept-Language header (bn or en)."
    ),
    "VERSION": "v1",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": "/api/v1",
    "COMPONENT_SPLIT_REQUEST": True,
}

# Only the Next.js server (on this machine) may tell us the visitor's IP with X-Forwarded-For.
TRUSTED_PROXY_IPS = ["127.0.0.1", "::1"]

# The public website. Gateway callback URLs and the redirects back to /bn/donate/... are built from it.
SITE_URL = os.getenv("SITE_URL", "http://localhost:3000").rstrip("/")

# After an admin save, Django tells the Next.js server which cached answers are stale (core/revalidate.py).
# Both empty = off (the frontend's cache then refreshes on its own within minutes).
FRONTEND_INTERNAL_URL = os.getenv("FRONTEND_INTERNAL_URL", "").rstrip("/")
REVALIDATE_SECRET = os.getenv("REVALIDATE_SECRET", "")

RECEIPT_TOKEN_SECRET = os.getenv("RECEIPT_TOKEN_SECRET") or (secrets.token_urlsafe(50) if TESTING else None)
if not RECEIPT_TOKEN_SECRET:
    raise RuntimeError("Set RECEIPT_TOKEN_SECRET in backend/.env (see .env.example for the command).")

SSLCOMMERZ_STORE_ID = os.getenv("SSLCOMMERZ_STORE_ID", "")
SSLCOMMERZ_STORE_PASSWORD = os.getenv("SSLCOMMERZ_STORE_PASSWORD", "")
SSLCOMMERZ_SANDBOX = env_bool("SSLCOMMERZ_SANDBOX", "true")
# SSLCommerz requires an email. When the donor gave none we send this one (the donor never sees it).
DONATION_FALLBACK_EMAIL = os.getenv("DONATION_FALLBACK_EMAIL", "donations@nooresadaqah.org")

# `manage.py seed` loads the frontend's mock data, so both apps show the same content.
SEED_FIXTURES_DIR = BASE_DIR.parent / "frontend" / "src" / "mocks" / "fixtures"
SEED_PUBLIC_DIR = BASE_DIR.parent / "frontend" / "public"  # sample files the fixtures link to (/samples/…)
SEED_ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "")
SEED_ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "")

# Email (docs/NOTIFICATIONS.md). EMAIL_PROVIDER=smtp sends through EMAIL_HOST: Mailpit in development
# (docker-compose.dev.yml; inbox at http://127.0.0.1:8025), the real mail server in production. console prints them.
EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "smtp")
EMAIL_BACKENDS = {
    "smtp": "django.core.mail.backends.smtp.EmailBackend",
    "console": "django.core.mail.backends.console.EmailBackend",
}
if EMAIL_PROVIDER not in EMAIL_BACKENDS:
    raise RuntimeError(f"EMAIL_PROVIDER must be one of {', '.join(EMAIL_BACKENDS)}.")
EMAIL_BACKEND = EMAIL_BACKENDS[EMAIL_PROVIDER]
EMAIL_HOST = os.getenv("EMAIL_HOST", "127.0.0.1")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "1025"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", "false")  # STARTTLS, usually port 587
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", "false")  # SSL from the start, usually port 465
if EMAIL_USE_TLS and EMAIL_USE_SSL:
    raise RuntimeError("Set only one of EMAIL_USE_TLS (port 587) and EMAIL_USE_SSL (port 465).")
EMAIL_TIMEOUT = 10  # seconds; a slow mail server must not hang a worker
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "রসিদ <receipts@nooresadaqah.org>")
EMAIL_MESSAGE_ID_DOMAIN = os.getenv("EMAIL_MESSAGE_ID_DOMAIN", "nooresadaqah.org")

CELERY_BROKER_URL = CACHES["default"]["LOCATION"]
CELERY_TASK_ACKS_LATE = True
CELERY_TIMEZONE = TIME_ZONE  # beat times below are Dhaka time
# The schedule lives here. Production beat runs django-celery-beat's DatabaseScheduler, which copies it into the
# database on start (and lets staff see it in /admin/); `celery -B` in development reads it directly.
CELERY_BEAT_SCHEDULE = {
    # DONATION_FLOW.md rule 5: settle donations still PENDING after 24 hours
    "cleanup-pending": {"task": "payments.tasks.cleanup_pending", "schedule": crontab(hour=3, minute=0)},
}


def admin_link(model, icon, title=None):
    """A sidebar entry for one admin list, shown only to staff allowed to see that model."""
    app, name = model.split(".")
    return {
        "title": title or name.replace("_", " ").capitalize(),
        "icon": icon,
        "link": reverse_lazy(f"admin:{app}_{name}_changelist"),
        "permission": lambda request: request.user.has_perm(f"{app}.view_{name}"),
    }


# Django admin theme (ADMIN.md "Unfold theme"). Colors only from frontend/src/app/tokens.css: the emerald scale
# has no 200–400 steps, so those reuse the nearest palette value.
UNFOLD = {
    "SITE_TITLE": "নূরে সাদাকাহ ফাউন্ডেশন",
    "SITE_HEADER": "নূরে সাদাকাহ ফাউন্ডেশন",
    "SITE_SUBHEADER": "Staff admin",
    "SITE_URL": SITE_URL,
    "SITE_ICON": lambda request: static("brand/logo.png"),
    "SITE_FAVICONS": [{"rel": "icon", "type": "image/png", "href": lambda request: static("brand/logo.png")}],
    "STYLES": [lambda request: static("core/admin.css")],
    "SCRIPTS": [lambda request: static("core/admin.js")],  # sidebar tooltips for the folded icon rail
    "DASHBOARD_CALLBACK": "core.dashboard.dashboard",  # the admin home page (ADMIN.md "Dashboard")
    "SHOW_VIEW_ON_SITE": False,
    "COLORS": {
        "primary": {
            "50": "#eaf6f0",
            "100": "#cde9dc",
            "200": "#cde9dc",
            "300": "#cde9dc",
            "400": "#1f8a63",
            "500": "#1f8a63",
            "600": "#16704f",
            "700": "#0f5a3f",
            "800": "#0b4631",
            "900": "#072e20",
            "950": "#041c13",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            {
                "items": [
                    {
                        "title": "ড্যাশবোর্ড (Dashboard)",
                        "icon": "dashboard",
                        "link": reverse_lazy("admin:index"),
                        "active": lambda request: request.path == reverse("admin:index"),
                    },
                ],
            },
            {
                "title": "দান (Donations)",
                "collapsible": True,
                "items": [
                    admin_link("donations.donation", "payments", "Donations"),
                    admin_link("donations.offlinetotal", "summarize", "Offline totals"),
                    admin_link("payments.gatewayevent", "receipt_long", "Gateway events"),
                    admin_link("notifications.outboundmessage", "mail", "Sent messages"),
                ],
            },
            {
                "title": "কনটেন্ট (Content)",
                "collapsible": True,
                "items": [
                    admin_link("content.fund", "savings", "Funds"),
                    admin_link("content.campaign", "campaign", "Campaigns"),
                    admin_link("content.program", "volunteer_activism", "Programs"),
                    admin_link("content.post", "article", "News posts"),
                    admin_link("content.postcategory", "label", "Categories"),
                    admin_link("content.galleryitem", "photo_library", "Gallery"),
                    admin_link("content.person", "groups", "People"),
                    admin_link("content.report", "description", "Reports"),
                    admin_link("content.job", "work", "Jobs"),
                    admin_link("content.page", "menu_book", "Pages"),
                ],
            },
            {
                "title": "যোগাযোগ (Contact)",
                "collapsible": True,
                "items": [
                    admin_link("engagement.contactmessage", "chat", "Messages"),
                    admin_link("engagement.volunteer", "diversity_3", "Volunteers"),
                    admin_link("engagement.subscriber", "mark_email_read", "Subscribers"),
                ],
            },
            {
                "title": "সেটিংস (Settings)",
                "collapsible": True,
                "items": [admin_link("core.sitesettings", "settings", "Site settings")],
            },
            {
                "title": "স্টাফ (Staff)",
                "collapsible": True,
                "items": [
                    admin_link("accounts.user", "person", "Users"),
                    admin_link("auth.group", "admin_panel_settings", "Groups"),
                    admin_link("audit.auditlog", "history", "Audit log"),
                ],
            },
        ],
    },
}

# Log ids only: never names, phone numbers, emails or gateway passwords.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}

# On the server (behind Nginx, HTTPS only).
if not DEBUG and not TESTING:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# pytest: no Redis, a fake SSLCommerz store, and gateway calls are faked in the tests themselves.
if TESTING:
    DEBUG = False
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    SITE_URL = "http://testserver"
    SSLCOMMERZ_STORE_ID = "teststore"
    SSLCOMMERZ_STORE_PASSWORD = secrets.token_urlsafe(16)  # random: the tests never reach SSLCommerz
    SSLCOMMERZ_SANDBOX = True
    CELERY_TASK_ALWAYS_EAGER = True  # tasks run inside the test, no Redis
    CELERY_TASK_EAGER_PROPAGATES = True
