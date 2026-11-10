from django.contrib import admin

from .models import Campaign, Fund


@admin.register(Fund)
class FundAdmin(admin.ModelAdmin):
    list_display = ("slug", "title_bn", "min_amount", "is_zakat_eligible", "is_fitra", "allow_recurring", "is_active")
    list_filter = ("is_active", "is_zakat_eligible")
    search_fields = ("slug", "title_bn", "title_en")


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ("slug", "title_bn", "fund", "goal_amount", "ends_at", "is_featured", "is_active")
    list_filter = ("is_active", "is_featured", "fund")
    search_fields = ("slug", "title_bn", "title_en")
