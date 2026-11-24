from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse

from .admin_base import AuditedAdmin, SortedTabularInline, in_group
from .models import ContactFaq, FitraRate, HomeImage, MobileBankingAccount, SiteSettings, Stat

# Settings only Admins may change (ADMIN.md permission matrix); Editors see them read only.
ADMIN_ONLY_FIELDS = (
    "address_bn", "address_en", "phone", "whatsapp", "email", "hours_bn", "hours_en", "map_embed_url",
    "reg_authority_bn", "reg_authority_en", "reg_number", "reg_date", "reg_certificate",
    "zakat_enabled", "silver_price_per_gram", "gold_price_per_gram", "karat", "nisab_source", "nisab_updated_at",
    "fitra_year", "fitra_open", "fitra_cutoff",
    "pay_sslcommerz", "pay_bkash", "recurring_mode_sslcommerz", "recurring_mode_bkash",
)  # fmt: skip


class AdminOnlyRows(SortedTabularInline):
    """A settings table only Admins may change (mobile banking numbers, fitra rates)."""

    def has_add_permission(self, request, obj=None):
        return in_group(request.user, "Admin") and super().has_add_permission(request, obj)

    def has_change_permission(self, request, obj=None):
        return in_group(request.user, "Admin") and super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return in_group(request.user, "Admin") and super().has_delete_permission(request, obj)


class StatInline(SortedTabularInline):
    model = Stat
    fields = ("value", "suffix", "label_bn", "label_en", "sort_order")
    verbose_name_plural = "Home stats"


class HomeImageInline(SortedTabularInline):
    model = HomeImage
    fields = ("slot", "image", "alt_bn", "alt_en", "sort_order")
    max_num = len(HomeImage.Slot.choices)
    verbose_name_plural = "Home images"


class ContactFaqInline(SortedTabularInline):
    model = ContactFaq
    fields = ("q_bn", "a_bn", "q_en", "a_en", "sort_order")
    verbose_name_plural = "Contact FAQ"


class MobileBankingInline(AdminOnlyRows):
    model = MobileBankingAccount
    fields = ("service", "number", "type", "sort_order")
    verbose_name_plural = "Mobile banking numbers"


class FitraRateInline(AdminOnlyRows):
    model = FitraRate
    fields = ("item_bn", "item_en", "amount", "sort_order")
    verbose_name_plural = "Fitra rates"


@admin.register(SiteSettings)
class SiteSettingsAdmin(AuditedAdmin):
    """One settings page. The list view goes straight to it; it can't be added to or deleted."""

    inlines = [StatInline, HomeImageInline, ContactFaqInline, MobileBankingInline, FitraRateInline]
    fieldsets = (
        ("যোগাযোগ (Contact)", {
            "classes": ["tab"],
            "fields": (("address_bn", "address_en"), ("phone", "whatsapp", "email"), ("hours_bn", "hours_en"),
                       "map_embed_url"),
        }),
        ("সামাজিক (Social)", {"classes": ["tab"], "fields": ("facebook", "youtube", "instagram", "linkedin")}),
        ("উক্তি ও পরিচিতি (Quote & about)", {
            "classes": ["tab"],
            "fields": (("quote_text_bn", "quote_text_en"), ("quote_source_bn", "quote_source_en"),
                       ("mission_bn", "mission_en"), ("vision_bn", "vision_en"), "promo_youtube_id"),
        }),
        ("নিবন্ধন (Registration)", {
            "classes": ["tab"],
            "fields": (("reg_authority_bn", "reg_authority_en"), ("reg_number", "reg_date"), "reg_certificate"),
        }),
        ("যাকাত ও ফিতরা (Zakat & fitra)", {
            "classes": ["tab"],
            "fields": ("zakat_enabled", ("silver_price_per_gram", "gold_price_per_gram", "karat"),
                       ("nisab_source", "nisab_updated_at"), ("fitra_year", "fitra_open", "fitra_cutoff")),
        }),
        ("পেমেন্ট (Payments)", {
            "classes": ["tab"],
            "fields": (("pay_sslcommerz", "recurring_mode_sslcommerz"), ("pay_bkash", "recurring_mode_bkash")),
        }),
    )  # fmt: skip

    def get_readonly_fields(self, request, obj=None):
        return () if in_group(request.user, "Admin") else ADMIN_ONLY_FIELDS

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        settings = SiteSettings.load()
        return HttpResponseRedirect(reverse("admin:core_sitesettings_change", args=[settings.pk]))
