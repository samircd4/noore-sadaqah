from django.contrib import admin

from core.admin_base import Admin, in_group

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(Admin):
    """Read only for everyone (ADMIN.md). Admins see every entry; others only their own actions."""

    list_display = ("created_at", "user", "action", "target", "ip")
    list_filter = ("action",)
    search_fields = ("action", "target", "user__email")
    date_hierarchy = "created_at"
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def get_queryset(self, request):
        queryset = super().get_queryset(request).select_related("user")
        return queryset if in_group(request.user, "Admin") else queryset.filter(user=request.user)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
