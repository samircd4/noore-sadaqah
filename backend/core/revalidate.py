"""
When staff save content in the admin, tell Next.js which cached API answers are now stale (ARCHITECTURE.md
"Revalidation"): after the commit, a Celery task POSTs the cache tags to the frontend's /internal/revalidate.
"""

from contextlib import contextmanager

from django.db import transaction
from django.db.models.signals import post_delete, post_save

_paused = False

# Model label → the API.md cache tags whose answers include that model's data.
TAGS = {
    "core.SiteSettings": ["site"],
    "core.Stat": ["site"],
    "core.MobileBankingAccount": ["site"],
    "core.FitraRate": ["site"],
    "core.ContactFaq": ["site"],
    "core.HomeImage": ["site"],
    "content.Fund": ["funds", "programs", "campaigns", "transparency"],
    "content.FundBankAccount": ["funds"],
    "content.Campaign": ["campaigns"],
    "content.Program": ["programs"],
    "content.ProgramImage": ["programs"],
    "content.ProgramGoal": ["programs"],
    "content.ProgramFaq": ["programs"],
    "content.ProgramImpact": ["programs"],
    "content.PostCategory": ["posts", "gallery"],
    "content.Post": ["posts"],
    "content.GalleryItem": ["gallery"],
    "content.Page": ["pages"],
    "content.Person": ["people"],
    "content.Report": ["reports"],
    "content.Job": ["jobs"],
    "donations.OfflineTotal": ["transparency"],
}


@contextmanager
def paused():
    """No revalidation while a command (seed) rewrites everything; one call for all tags afterwards."""
    global _paused
    _paused = True
    try:
        yield
    finally:
        _paused = False


def content_changed(sender, instance=None, raw=False, **kwargs):
    if raw or _paused:  # loaddata, or a command that revalidates once at the end
        return
    tags = TAGS.get(sender._meta.label)
    if tags:
        from .tasks import revalidate

        transaction.on_commit(lambda: revalidate.delay(tags), robust=True)


def tags_changed(tags):
    """For changes that send no save signal (queryset.update() in admin actions): revalidate after the commit."""
    from .tasks import revalidate

    transaction.on_commit(lambda: revalidate.delay(list(tags)), robust=True)


def revalidate_everything():
    tags_changed(sorted({tag for tags in TAGS.values() for tag in tags}))


def connect():
    post_save.connect(content_changed, dispatch_uid="revalidate_save")
    post_delete.connect(content_changed, dispatch_uid="revalidate_delete")
