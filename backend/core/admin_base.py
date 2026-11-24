"""
Shared admin pieces (ADMIN.md). Every admin page uses Unfold's ModelAdmin; pages for audited models also write an
AuditLog row with the changed fields on each save.
"""

from unfold.admin import ModelAdmin, StackedInline, TabularInline

from audit.helpers import audit, form_changes


class Admin(ModelAdmin):
    """The base for every admin page: Unfold look, warns about unsaved changes, no accidental deletes of rows
    that other rows depend on (Django already refuses those)."""

    warn_unsaved_form = True
    compressed_fields = True
    list_fullwidth = True  # lists use the whole screen width; edit forms keep a readable width


class AuditedAdmin(Admin):
    """Writes "<model>.create" / "<model>.update" with {before, after} of the changed fields (ADMIN.md "Audit log")."""

    def save_model(self, request, obj, form, change):
        before, after = form_changes(form)
        super().save_model(request, obj, form, change)
        if change and not form.changed_data:
            return
        action = f"{obj._meta.model_name}.{'update' if change else 'create'}"
        audit(request, action, obj, before, after)

    def save_formset(self, request, form, formset, change):
        """Changes to inline rows (bank accounts, stats …) are logged against the parent."""
        changes = [(f.instance, *form_changes(f)) for f in formset.forms if f.has_changed()]
        super().save_formset(request, form, formset, change)
        deleted = [str(obj) for obj in formset.deleted_objects]
        if changes or deleted:
            model = formset.model._meta.model_name
            after = {f"{model}:{inst.pk or 'new'}": a for inst, _, a in changes}
            before = {f"{model}:{inst.pk or 'new'}": b for inst, b, _ in changes}
            if deleted:
                after[f"{model}:deleted"] = deleted
            audit(request, f"{form.instance._meta.model_name}.update", form.instance, before, after)

    def delete_model(self, request, obj):
        audit(request, f"{obj._meta.model_name}.delete", obj)
        super().delete_model(request, obj)


class SortedTabularInline(TabularInline):
    """Table rows staff can drag into order (sort_order is set by dragging)."""

    extra = 0
    ordering_field = "sort_order"
    hide_ordering_field = True
    tab = True


class SortedStackedInline(StackedInline):
    extra = 0
    ordering_field = "sort_order"
    hide_ordering_field = True
    tab = True


def in_group(user, *names):
    """True for superusers and for members of one of these Groups (ADMIN.md "Groups")."""
    return user.is_superuser or user.groups.filter(name__in=names).exists()
