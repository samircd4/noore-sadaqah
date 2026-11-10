from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import AdminUserCreationForm, UserChangeForm

from .models import User


class UserCreateForm(AdminUserCreationForm):
    class Meta:
        model = User
        fields = ("email",)


class UserEditForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Staff and donors. Groups and per-group permissions come with the full admin (ADMIN.md, ROADMAP B1)."""

    form = UserEditForm
    add_form = UserCreateForm
    ordering = ("email",)
    list_display = ("email", "phone", "name", "is_staff", "is_active")
    list_filter = ("is_staff", "is_active")
    search_fields = ("email", "phone", "name")
    fieldsets = (
        (None, {"fields": ("email", "phone", "name", "preferred_locale", "password")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),)
