from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.utils.html import format_html
from unfold.decorators import display
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from core.admin_base import AuditedAdmin

from .models import User


class UserCreateForm(UserCreationForm):
    class Meta:
        model = User
        fields = ("email",)


class UserEditForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin, AuditedAdmin):
    """Staff and donors (ADMIN.md "Users & groups"). Every change is audited; passwords never reach the log."""

    form = UserEditForm
    add_form = UserCreateForm
    change_password_form = AdminPasswordChangeForm
    ordering = ("email",)
    list_display = ("avatar", "email", "phone", "name", "is_staff", "is_active")
    list_display_links = ("avatar", "email")
    list_filter = ("is_staff", "is_active", "groups")
    search_fields = ("email", "phone", "name")
    filter_horizontal = ("groups",)
    fieldsets = (
        (None, {"fields": ("email", "phone", "name", "photo", "preferred_locale", "password")}),
        ("Access", {"fields": ("is_active", "is_staff", "groups")}),
        ("Developer only", {"classes": ["collapse"], "fields": ("is_superuser", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined", "locked_until", "failed_logins")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),)

    @display(description="")
    def avatar(self, obj):
        if not obj.photo:
            return "—"
        return format_html(
            '<img src="{}" alt="" style="width:32px;height:32px;border-radius:9999px;object-fit:cover">', obj.photo.url
        )

    def get_readonly_fields(self, request, obj=None):
        # Only a superuser may make another superuser or hand out single permissions (ADMIN.md: Groups only).
        return () if request.user.is_superuser else ("is_superuser", "user_permissions")

    def has_change_permission(self, request, obj=None):
        """A superuser account (the developer's) is changed only by a superuser: its password, its access, anything.
        Django's change-password page asks this too."""
        if obj is not None and obj.is_superuser and not request.user.is_superuser:
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if obj is not None and obj.is_superuser and not request.user.is_superuser:
            return False
        return super().has_delete_permission(request, obj)


admin.site.unregister(Group)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, AuditedAdmin):
    """Admin, Accountant and Editor are created by `seed` (core/groups.py); their permissions change only with a data
    migration (ADMIN.md). Staff see the groups; only a superuser may edit them, so no Admin can hand their own group
    a permission the matrix forbids (such as deleting donations)."""

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
