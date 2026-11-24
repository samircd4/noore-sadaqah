from django.contrib import admin

from .models import OutboundMessage


@admin.register(OutboundMessage)
class OutboundMessageAdmin(admin.ModelAdmin):
    """Read only: a record of what was sent (ADMIN.md: nobody may delete it)."""

    list_display = ("created_at", "channel", "template", "status", "donation", "error")
    list_filter = ("channel", "template", "status")
    search_fields = ("donation__gateway_ref", "donation__receipt_no")
    readonly_fields = [f.name for f in OutboundMessage._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
