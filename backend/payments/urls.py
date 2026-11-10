from django.urls import path

from . import views

urlpatterns = [
    path("sslcommerz/ipn/", views.ipn, name="sslcommerz-ipn"),
    path("sslcommerz/success/", views.success, name="sslcommerz-success"),
    path("sslcommerz/fail/", views.fail, name="sslcommerz-fail"),
    path("sslcommerz/cancel/", views.cancel, name="sslcommerz-cancel"),
]
