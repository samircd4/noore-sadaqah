from django.contrib import admin, messages
from unfold.decorators import action

from core.admin_base import Admin

from .models import ContactMessage, Subscriber, Volunteer


@admin.register(ContactMessage)
class ContactMessageAdmin(Admin):
    list_display = ("created_at", "name", "subject", "handled", "handled_by")
    list_filter = ("handled",)
    search_fields = ("name", "contact", "subject")
    readonly_fields = ("name", "contact", "subject", "message", "created_at", "handled_by")
    fields = ("created_at", "name", "contact", "subject", "message", "handled", "handled_by")
    actions = ["mark_handled"]

    def has_add_permission(self, request):
        return False

    def save_model(self, request, obj, form, change):
        if "handled" in form.changed_data:
            obj.handled_by = request.user if obj.handled else None
        super().save_model(request, obj, form, change)

    @action(description="Mark as handled", permissions=["change"])
    def mark_handled(self, request, queryset):
        count = queryset.filter(handled=False).update(handled=True, handled_by=request.user)
        self.message_user(request, f"{count} message(s) marked as handled.", messages.SUCCESS)


@admin.register(Volunteer)
class VolunteerAdmin(Admin):
    list_display = ("created_at", "name", "district", "availability", "handled")
    list_filter = ("handled", "availability", "district")
    search_fields = ("name", "phone", "email", "skills")
    readonly_fields = ("name", "phone", "email", "district", "skills", "availability", "created_at")
    fields = ("created_at", "name", "phone", "email", "district", "skills", "availability", "handled")
    list_editable = ("handled",)

    def has_add_permission(self, request):
        return False


@admin.register(Subscriber)
class SubscriberAdmin(Admin):
    list_display = ("email", "locale", "created_at", "unsubscribed_at")
    list_filter = ("locale", ("unsubscribed_at", admin.EmptyFieldListFilter))
    search_fields = ("email",)
    readonly_fields = ("email", "locale", "created_at", "unsubscribed_at")

    def has_add_permission(self, request):
        return False
