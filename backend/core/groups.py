"""
The staff Groups and what each may do in the admin (ADMIN.md "Permission matrix"). `manage.py seed` applies this;
after launch a change here ships with a data migration that calls apply_groups().

Letters: v = view, a = add, c = change, d = delete. Field-level limits (Editors can't change fund amounts, campaign
goals or the money switches) live in the ModelAdmin classes.
"""

from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

CONTENT_ROWS = "vacd"
EDITOR_CONTENT = {
    "content.fund": "vc",
    "content.campaign": "vc",
    "content.fundbankaccount": "v",
    "content.program": "vac",
    "content.programimage": CONTENT_ROWS,
    "content.programgoal": CONTENT_ROWS,
    "content.programfaq": CONTENT_ROWS,
    "content.programimpact": CONTENT_ROWS,
    "content.post": "vacd",
    "content.postcategory": "vac",
    "content.galleryitem": "vacd",
    "content.person": "vacd",
    "content.report": "vacd",
    "content.job": "vacd",
    "content.page": "vc",
    "engagement.contactmessage": "vc",
    "engagement.volunteer": "vc",
    "core.sitesettings": "vc",
    "core.stat": CONTENT_ROWS,
    "core.homeimage": CONTENT_ROWS,
    "core.contactfaq": CONTENT_ROWS,
    "core.mobilebankingaccount": "v",
    "core.fitrarate": "v",
}

ACCOUNTANT = {
    "donations.donation": "vac",
    "donations.offlinetotal": "vac",
    "payments.gatewayevent": "v",
    "notifications.outboundmessage": "v",
    "content.fund": "v",
    "content.campaign": "v",
    "audit.auditlog": "v",
}

# Admins may do everything in these apps except delete money and evidence rows.
ADMIN_APPS = ["core", "accounts", "content", "donations", "payments", "notifications", "engagement", "audit",
              "auth", "django_celery_beat"]  # fmt: skip
NEVER_DELETED = {"donations.donation", "payments.gatewayevent", "notifications.outboundmessage", "audit.auditlog"}
EXTRA = {"Admin": ["engagement.export_subscribers"]}

LETTERS = {"v": "view", "a": "add", "c": "change", "d": "delete"}


def codenames(spec):
    """{"content.fund": "vc"} → [("content", "view_fund"), ("content", "change_fund")]"""
    for label, letters in spec.items():
        app, model = label.split(".")
        for letter in letters:
            yield app, f"{LETTERS[letter]}_{model}"


def permissions(pairs):
    found = []
    for app, codename in pairs:
        found.append(Permission.objects.get(content_type__app_label=app, codename=codename))
    return found


def admin_permissions():
    """Every permission in ADMIN_APPS, without delete on NEVER_DELETED and without changes to audit and evidence."""
    allowed = []
    for perm in Permission.objects.filter(content_type__app_label__in=ADMIN_APPS).select_related("content_type"):
        label = f"{perm.content_type.app_label}.{perm.content_type.model}"
        action = perm.codename.split("_", 1)[0]
        if label in NEVER_DELETED and action == "delete":
            continue
        if label in {"audit.auditlog", "payments.gatewayevent", "notifications.outboundmessage"} and action != "view":
            continue
        allowed.append(perm)
    return allowed


def apply_groups():
    """Create or update the Admin, Accountant and Editor groups. Returns the groups by name."""
    ContentType.objects.clear_cache()
    wanted = {
        "Admin": admin_permissions() + permissions(tuple(p.split(".")) for p in EXTRA["Admin"]),
        "Accountant": permissions(codenames(ACCOUNTANT)),
        "Editor": permissions(codenames(EDITOR_CONTENT)),
    }
    groups = {}
    for name, perms in wanted.items():
        group, _ = Group.objects.get_or_create(name=name)
        group.permissions.set(perms)
        groups[name] = group
    return groups
