from django.contrib import admin

from .models import Donation


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
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
