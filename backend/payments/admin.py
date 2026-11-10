from django.contrib import admin

from .models import GatewayEvent


@admin.register(GatewayEvent)
class GatewayEventAdmin(admin.ModelAdmin):
    """Read only: the evidence for disputes (RUNBOOK.md)."""

    list_display = ("received_at", "provider", "kind", "status", "gateway_ref", "donation")
    list_filter = ("provider", "kind")
    search_fields = ("gateway_ref",)
    readonly_fields = [f.name for f in GatewayEvent._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
