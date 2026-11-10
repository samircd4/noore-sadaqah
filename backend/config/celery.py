"""Celery app (DECISIONS.md D5). Tasks arrive with receipts and notifications (ROADMAP B2)."""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("noore")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
