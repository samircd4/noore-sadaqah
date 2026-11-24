from django.contrib import admin

from core.admin_base import Admin, AuditedAdmin

from .models import Donation, OfflineTotal


@admin.register(Donation)
class DonationAdmin(Admin):
    """Read only for now. Offline entry, refunds, resend and CSV export come with the full admin (ADMIN.md)."""

    list_display = ("gateway_ref", "created_at", "amount", "fund", "method", "status", "receipt_no")
    list_filter = ("status", "method", "fund")
    search_fields = ("gateway_ref", "receipt_no", "donor_phone")
    date_hierarchy = "created_at"
    readonly_fields = [f.name for f in Donation._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(OfflineTotal)
class OfflineTotalAdmin(AuditedAdmin):
    """Yearly money received outside the website, added to /transparency (Admin only by Group permissions)."""

    list_display = ("year", "fund", "total", "note")
    list_filter = ("year", "fund")
    fields = (("year", "fund", "total"), "note")
