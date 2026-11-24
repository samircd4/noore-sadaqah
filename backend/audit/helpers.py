"""audit(...) writes one AuditLog row for a staff change (ADMIN.md "Audit log")."""

from django.db.models.fields.files import FieldFile

from core.utils import client_ip

from .models import AuditLog


# Never copied into the log, even when changed (SECURITY.md §7): password, password1, password2, usable_password …
def is_secret(name):
    return "password" in name


def plain(value):
    """A value the JSON column can hold: files by name, objects by their text."""
    if isinstance(value, FieldFile):
        return value.name or ""
    if value is None or isinstance(value, bool | int | str):
        return value
    if isinstance(value, list | tuple):
        return [plain(v) for v in value]
    if hasattr(value, "all") and callable(value.all):  # a queryset from a many-to-many field (groups)
        return sorted(str(v) for v in value.all())
    return str(value)


def audit(request, action, obj, before=None, after=None):
    """Log `action` on `obj`. before/after hold only the fields that changed; secrets are replaced by "changed"."""
    data = None
    if before is not None or after is not None:
        before, after = dict(before or {}), dict(after or {})
        for name in {n for n in before.keys() | after.keys() if is_secret(n)}:
            before[name], after[name] = "…", "changed"
        data = {"before": {k: plain(v) for k, v in before.items()}, "after": {k: plain(v) for k, v in after.items()}}
    return AuditLog.objects.create(
        user=request.user,
        action=action,
        target=f"{obj._meta.label}:{obj.pk}",
        data=data,
        ip=client_ip(request),
    )


def form_changes(form):
    """(before, after) for the fields a ModelForm changed."""
    before = {name: form.initial.get(name) for name in form.changed_data}
    after = {name: form.cleaned_data.get(name) for name in form.changed_data}
    return before, after
