import logging

import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, acks_late=True, max_retries=3)
def revalidate(self, tags):
    """POST the stale cache tags to Next.js. Safe to repeat: revalidating a tag twice does no harm.
    Without FRONTEND_INTERNAL_URL / REVALIDATE_SECRET (tests, a backend run alone) it does nothing; the frontend's
    own cache lifetime still refreshes the pages within minutes."""
    if not settings.FRONTEND_INTERNAL_URL or not settings.REVALIDATE_SECRET:
        return "skipped"
    try:
        response = requests.post(
            f"{settings.FRONTEND_INTERNAL_URL}/internal/revalidate",
            json={"tags": sorted(set(tags))},
            headers={"X-Revalidate-Secret": settings.REVALIDATE_SECRET},
            timeout=10,
        )
        response.raise_for_status()
    except requests.ConnectionError:  # the frontend isn't running (e.g. the backend started alone): nothing to tell
        logger.info("revalidate %s skipped: the frontend is not reachable", ",".join(tags))
        return "unreachable"
    except requests.RequestException as exc:
        logger.warning("revalidate %s failed: %s", ",".join(tags), type(exc).__name__)
        raise self.retry(countdown=30) from None
    return "sent"
