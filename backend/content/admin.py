"""
Content admin (ADMIN.md "Funds, Programs, Campaigns …"): Bengali and English in separate tabs, lists inside a
model as drag-to-sort table rows, image previews. Money fields are Admin-only; Editors change text and photos.
"""

from django.contrib import admin, messages
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
from django.utils.html import format_html
from unfold.contrib.forms.widgets import ArrayWidget
from unfold.decorators import action, display

from core import revalidate
from core.admin_base import Admin, AuditedAdmin, SortedStackedInline, SortedTabularInline, in_group

from .models import (
    Campaign,
    Fund,
    FundBankAccount,
    GalleryItem,
    Job,
    Page,
    Person,
    Post,
    PostCategory,
    Program,
    ProgramFaq,
    ProgramGoal,
    ProgramImage,
    ProgramImpact,
    Report,
)

NUMBER_LISTS = {ArrayField: {"widget": ArrayWidget}}  # [100, 200, 500] edited as a row of boxes


def preview(file, height=48):
    if not file:
        return "—"
    return format_html('<img src="{}" style="height:{}px;border-radius:8px" alt="">', file.url, height)


def tabs(bn, en, *others):
    """Fieldsets: a বাংলা tab, an English tab, then any other (title, fields) tabs."""
    sets = [("বাংলা", {"classes": ["tab"], "fields": bn}), ("English", {"classes": ["tab"], "fields": en})]
    sets += [(title, {"classes": ["tab"], "fields": fields}) for title, fields in others]
    return sets


class AdminOnlyInline(SortedTabularInline):
    """Rows only Admins may change; Editors see them."""

    def has_add_permission(self, request, obj=None):
        return in_group(request.user, "Admin") and super().has_add_permission(request, obj)

    def has_change_permission(self, request, obj=None):
        return in_group(request.user, "Admin") and super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return in_group(request.user, "Admin") and super().has_delete_permission(request, obj)


# ---- Funds ------------------------------------------------------------------------------------------------------


class FundBankAccountInline(AdminOnlyInline):
    model = FundBankAccount
    fields = ("bank", "account_name", "branch", "number", "routing", "swift", "sort_order")
    verbose_name_plural = "Bank accounts"


FUND_MONEY_FIELDS = ("slug", "preset_amounts", "min_amount", "is_zakat_eligible", "is_fitra", "allow_recurring",
                     "is_active")  # fmt: skip


@admin.register(Fund)
class FundAdmin(AuditedAdmin):
    list_display = ("cover_preview", "title_bn", "slug", "min_amount", "is_zakat_eligible", "is_active", "sort_order")
    list_display_links = ("cover_preview", "title_bn")
    list_filter = ("is_active", "is_zakat_eligible")
    search_fields = ("slug", "title_bn", "title_en")
    ordering_field = "sort_order"
    hide_ordering_field = True
    formfield_overrides = NUMBER_LISTS
    inlines = [FundBankAccountInline]
    fieldsets = tabs(
        ("title_bn", "summary_bn", "body_bn", "cover_alt_bn"),
        ("title_en", "summary_en", "body_en", "cover_alt_en"),
        ("ছবি (Photo)", ("cover_image",)),
        ("টাকা (Money, Admin only)", ("slug", "preset_amounts", "min_amount",
                                      ("is_zakat_eligible", "is_fitra", "allow_recurring", "is_active"))),
    )  # fmt: skip

    @display(description="Photo")
    def cover_preview(self, obj):
        return preview(obj.cover_image)

    def get_readonly_fields(self, request, obj=None):
        return () if in_group(request.user, "Admin") else FUND_MONEY_FIELDS

    def has_add_permission(self, request):
        return in_group(request.user, "Admin") and super().has_add_permission(request)


# ---- Campaigns --------------------------------------------------------------------------------------------------

CAMPAIGN_MONEY_FIELDS = ("goal_amount", "offline_raised", "offline_donors", "starts_at", "ends_at", "fund")


@admin.register(Campaign)
class CampaignAdmin(AuditedAdmin):
    list_display = ("cover_preview", "title_bn", "fund", "goal_amount", "ends_at", "is_featured", "is_active")
    list_display_links = ("cover_preview", "title_bn")
    list_filter = ("is_active", "is_featured", "fund")
    search_fields = ("slug", "title_bn", "title_en")
    formfield_overrides = NUMBER_LISTS
    fieldsets = tabs(
        ("title_bn", "summary_bn", "body_bn", "cover_alt_bn"),
        ("title_en", "summary_en", "body_en", "cover_alt_en"),
        ("ছবি (Photo)", ("cover_image",)),
        ("লক্ষ্য (Goal & dates)", ("slug", "fund", ("goal_amount", "offline_raised", "offline_donors"),
                                   ("starts_at", "ends_at"), ("monthly_options", "highlighted_option"),
                                   ("is_featured", "is_active"))),
    )  # fmt: skip

    @display(description="Photo")
    def cover_preview(self, obj):
        return preview(obj.cover_image)

    def get_readonly_fields(self, request, obj=None):
        return () if in_group(request.user, "Admin") else CAMPAIGN_MONEY_FIELDS


# ---- Programs ---------------------------------------------------------------------------------------------------


class ProgramImageInline(SortedTabularInline):
    model = ProgramImage
    fields = ("image", "alt_bn", "alt_en", "sort_order")
    verbose_name_plural = "Gallery images"


class ProgramGoalInline(SortedTabularInline):
    model = ProgramGoal
    fields = ("text_bn", "text_en", "sort_order")
    verbose_name_plural = "Goals"


class ProgramFaqInline(SortedStackedInline):
    model = ProgramFaq
    fields = (("q_bn", "q_en"), ("a_bn", "a_en"), "sort_order")
    verbose_name_plural = "FAQ"


class ProgramImpactInline(SortedTabularInline):
    model = ProgramImpact
    fields = ("year", "metric_bn", "metric_en", "value", "sort_order")
    verbose_name_plural = "Impact numbers"


PROGRAM_ADMIN_FIELDS = ("slug", "fund", "is_active")


@admin.register(Program)
class ProgramAdmin(Admin):
    list_display = ("cover_preview", "title_bn", "badge_bn", "fund", "is_featured", "is_active", "sort_order")
    list_display_links = ("cover_preview", "title_bn")
    list_filter = ("is_active", "is_featured", "fund")
    search_fields = ("slug", "title_bn", "title_en")
    ordering_field = "sort_order"
    hide_ordering_field = True
    inlines = [ProgramGoalInline, ProgramImpactInline, ProgramFaqInline, ProgramImageInline]
    fieldsets = tabs(
        ("badge_bn", "title_bn", "summary_bn", "body_bn", "beneficiary_bn", "area_bn", "duration_bn", "cover_alt_bn"),
        ("badge_en", "title_en", "summary_en", "body_en", "beneficiary_en", "area_en", "duration_en", "cover_alt_en"),
        ("ছবি ও তহবিল (Photo & fund)", ("cover_image", "slug", "fund", ("is_featured", "is_active"))),
    )

    @display(description="Photo")
    def cover_preview(self, obj):
        return preview(obj.cover_image)

    def get_readonly_fields(self, request, obj=None):
        # Editors change text and photos only (ADMIN.md); the fund decides where the donate box sends money.
        return () if in_group(request.user, "Admin") else PROGRAM_ADMIN_FIELDS


# ---- News and gallery -------------------------------------------------------------------------------------------


@admin.register(PostCategory)
class PostCategoryAdmin(Admin):
    list_display = ("name_bn", "name_en", "slug", "sort_order")
    ordering_field = "sort_order"
    hide_ordering_field = True
    fields = ("slug", ("name_bn", "name_en"))


@admin.register(Post)
class PostAdmin(Admin):
    list_display = ("cover_preview", "title_bn", "category", "status", "published_at")
    list_display_links = ("cover_preview", "title_bn")
    list_filter = ("category", ("published_at", admin.EmptyFieldListFilter))
    search_fields = ("slug", "title_bn", "title_en")
    date_hierarchy = "published_at"
    actions = ["publish_now"]
    fieldsets = tabs(
        ("title_bn", "excerpt_bn", "body_bn", "cover_alt_bn"),
        ("title_en", "excerpt_en", "body_en", "cover_alt_en"),
        ("প্রকাশ (Publishing)", ("cover_image", "slug", "category", "published_at")),
    )

    @display(description="Photo")
    def cover_preview(self, obj):
        return preview(obj.cover_image)

    @display(description="Status", label={"Published": "success", "Scheduled": "info", "Draft": "warning"})
    def status(self, obj):
        if not obj.published_at:
            return "Draft"
        return "Published" if obj.published_at <= timezone.now() else "Scheduled"

    @action(description="প্রকাশ করুন (Publish now)", permissions=["change"])
    def publish_now(self, request, queryset):
        count = queryset.filter(published_at__isnull=True).update(published_at=timezone.now())
        if count:  # update() sends no save signal: tell Next.js ourselves (core/revalidate.py)
            revalidate.tags_changed(["posts"])
        self.message_user(request, f"{count} post(s) published.", messages.SUCCESS)

    def save_model(self, request, obj, form, change):
        if change and "slug" in form.changed_data and form.initial.get("published_at"):
            self.message_user(request, "The slug of a published post changed: old links to it now break.",
                              messages.WARNING)  # fmt: skip
        super().save_model(request, obj, form, change)


@admin.register(GalleryItem)
class GalleryItemAdmin(Admin):
    list_display = ("image_preview", "caption_bn", "kind", "category", "taken_at", "is_published")
    list_display_links = ("image_preview", "caption_bn")
    list_filter = ("kind", "category", "is_published")
    search_fields = ("caption_bn", "caption_en", "alt_bn")
    fieldsets = tabs(
        ("alt_bn", "caption_bn"),
        ("alt_en", "caption_en"),
        ("ছবি (Photo or video)", ("kind", "image", "youtube_id", "category", "taken_at", "is_published")),
    )

    @display(description="Photo")
    def image_preview(self, obj):
        return preview(obj.image)


# ---- About-the-organisation -------------------------------------------------------------------------------------


@admin.register(Person)
class PersonAdmin(Admin):
    list_display = ("photo_preview", "name_bn", "role_bn", "photo_consent", "is_active", "sort_order")
    list_display_links = ("photo_preview", "name_bn")
    list_filter = ("is_active", "photo_consent")
    ordering_field = "sort_order"
    hide_ordering_field = True
    fieldsets = tabs(
        ("name_bn", "role_bn", "bio_bn", "photo_alt_bn"),
        ("name_en", "role_en", "bio_en", "photo_alt_en"),
        ("ছবি (Photo)", ("photo", "photo_consent", "is_active")),
    )

    @display(description="Photo")
    def photo_preview(self, obj):
        return preview(obj.photo)


@admin.register(Report)
class ReportAdmin(Admin):
    list_display = ("title_bn", "kind", "year", "published_at")
    list_filter = ("kind", "year")
    search_fields = ("title_bn", "title_en")
    fields = ("kind", "year", ("title_bn", "title_en"), "file", "published_at")


@admin.register(Job)
class JobAdmin(Admin):
    list_display = ("title_bn", "location_bn", "closes_at", "is_open", "sort_order")
    list_filter = ("is_open",)
    ordering_field = "sort_order"
    hide_ordering_field = True
    fieldsets = tabs(
        ("title_bn", "location_bn", "body_bn"),
        ("title_en", "location_en", "body_en"),
        ("আবেদন (Applying)", ("slug", "apply_email", "apply_url", "closes_at", "is_open")),
    )


# Legal text: only Admins change the policy pages; Editors may change "about" and "how-we-spend" (ADMIN.md).
EDITOR_PAGES = {"about", "how-we-spend"}


@admin.register(Page)
class PageAdmin(Admin):
    """The fixed set of long pages created by `seed`: edit only, never add or delete."""

    list_display = ("title_bn", "slug", "updated_at")
    readonly_fields = ("slug",)
    fieldsets = tabs(("title_bn", "body_bn"), ("title_en", "body_en"), ("Page", ("slug",)))

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        if obj is not None and obj.slug not in EDITOR_PAGES and not in_group(request.user, "Admin"):
            return False
        return super().has_change_permission(request, obj)
