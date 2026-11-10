"""
All Django settings in one file. Secrets and per-machine values come from backend/.env (never committed);
see .env.example. Locally DJANGO_DEBUG=true; on the server it is false.
"""

import os
import secrets
import sys
from pathlib import Path

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
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    "rest_framework",
    "core",
    "accounts",
    "content",
    "donations",
    "payments",
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
        "DIRS": [],
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
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    # Donor login (JWT) comes in phase B3. No session login on the API, so the Next.js server needs no CSRF token.
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "UNAUTHENTICATED_USER": None,
    # Errors in the shape the frontend expects: {"error": {"code": ..., "fields": ...}} (docs/API.md)
    "EXCEPTION_HANDLER": "core.errors.api_error_handler",
}

# Only the Next.js server (on this machine) may tell us the visitor's IP with X-Forwarded-For.
TRUSTED_PROXY_IPS = ["127.0.0.1", "::1"]

# The public website. Gateway callback URLs and the redirects back to /bn/donate/... are built from it.
SITE_URL = os.getenv("SITE_URL", "http://localhost:3000").rstrip("/")

RECEIPT_TOKEN_SECRET = os.getenv("RECEIPT_TOKEN_SECRET") or (secrets.token_urlsafe(50) if TESTING else None)
if not RECEIPT_TOKEN_SECRET:
    raise RuntimeError("Set RECEIPT_TOKEN_SECRET in backend/.env (see .env.example for the command).")

SSLCOMMERZ_STORE_ID = os.getenv("SSLCOMMERZ_STORE_ID", "")
SSLCOMMERZ_STORE_PASSWORD = os.getenv("SSLCOMMERZ_STORE_PASSWORD", "")
SSLCOMMERZ_SANDBOX = env_bool("SSLCOMMERZ_SANDBOX", "true")
# SSLCommerz requires an email. When the donor gave none we send this one (the donor never sees it).
DONATION_FALLBACK_EMAIL = os.getenv("DONATION_FALLBACK_EMAIL", "donations@nooresadaqah.org")

# `manage.py seed` loads the frontend's mock data, so both apps show the same funds.
SEED_FIXTURES_DIR = BASE_DIR.parent / "frontend" / "src" / "mocks" / "fixtures"
SEED_ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "")
SEED_ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "")

CELERY_BROKER_URL = CACHES["default"]["LOCATION"]
CELERY_TASK_ACKS_LATE = True
CELERY_TIMEZONE = TIME_ZONE

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
