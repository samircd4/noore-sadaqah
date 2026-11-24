from django.urls import path

from . import views

urlpatterns = [
    path("site/", views.site),
    path("funds/", views.funds),
    path("funds/<slug:slug>/", views.fund),
    path("programs/", views.programs),
    path("programs/<slug:slug>/", views.program),
    path("campaigns/", views.campaigns),
    path("campaigns/<slug:slug>/", views.campaign),
    path("post-categories/", views.post_categories),
    path("posts/", views.posts),
    path("posts/<slug:slug>/", views.post),
    path("gallery/", views.gallery),
    path("people/", views.people),
    path("reports/", views.reports),
    path("jobs/", views.jobs),
    path("pages/<slug:slug>/", views.page),
    path("transparency/totals/", views.transparency_totals),
]
