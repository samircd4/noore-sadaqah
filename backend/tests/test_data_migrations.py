"""The B1 migrations move the old JSON settings and bank details into the new tables (DECISIONS.md D18)."""

import importlib
from types import SimpleNamespace

import pytest
from django.apps import apps as real_apps

from content.models import Fund, FundBankAccount
from core.models import ContactFaq, MobileBankingAccount, SiteSettings, Stat

pytestmark = pytest.mark.django_db

settings_migration = importlib.import_module("core.migrations.0002_settings_tables")
content_migration = importlib.import_module("content.migrations.0002_b1_content")


class Rows:
    """Stands in for a model manager that the current code no longer has (SiteSetting, Fund.bank_details)."""

    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows

    def exclude(self, **kwargs):
        return self.rows


class FakeApps:
    def __init__(self, **old_models):
        self.old_models = old_models

    def get_model(self, app, name):
        if name in self.old_models:
            return self.old_models[name]
        return real_apps.get_model(app, name)


def test_site_settings_are_copied():
    old = {
        "contact": {"address": {"bn": "ঢাকা", "en": "Dhaka"}, "phone": "+8801700000000", "email": "info@x.org"},
        "quote": {"text": {"bn": "উক্তি", "en": "Quote"}, "source": {"bn": "উৎস"}},
        "registration": {"authority": {"bn": "সমাজসেবা", "en": "Social Services"}, "number": "D-1", "date": "2021-03-15"},
        "payment_methods": ["sslcommerz"],
        "stats": [{"value": 100, "suffix": "+", "label": {"bn": "পরিবার", "en": "Families"}}],
        "mobile_banking": [{"service": "bkash", "number": "01700000000", "type": "merchant"}],
        "contact_faq": [{"q": {"bn": "প্রশ্ন"}, "a": {"bn": "উত্তর"}}],
        "fitra": {"year": 2027, "open": False, "rates": [{"item": {"bn": "গম"}, "amount": 115}]},
    }
    SiteSetting = SimpleNamespace(objects=Rows([SimpleNamespace(key=k, value=v) for k, v in old.items()]))
    settings_migration.copy_site_settings(FakeApps(SiteSetting=SiteSetting), None)

    site = SiteSettings.objects.get(pk=1)
    assert (site.address_bn, site.address_en, site.phone) == ("ঢাকা", "Dhaka", "+8801700000000")
    assert (site.quote_text_en, site.quote_source_bn, site.reg_authority_en) == ("Quote", "উৎস", "Social Services")
    assert (site.pay_sslcommerz, site.pay_bkash, site.fitra_year) == (True, False, 2027)
    assert Stat.objects.get().label_en == "Families"
    assert MobileBankingAccount.objects.get().number == "01700000000"
    assert ContactFaq.objects.get().a_bn == "উত্তর"
    assert site.fitrarate_set.get().amount == 115


def test_nothing_to_copy_on_a_new_database():
    SiteSetting = SimpleNamespace(objects=Rows([]))
    settings_migration.copy_site_settings(FakeApps(SiteSetting=SiteSetting), None)
    assert not SiteSettings.objects.exists()


def test_bank_details_become_rows():
    fund = Fund.objects.create(slug="zakat", title_bn="যাকাত", summary_bn="x", body_bn="x")
    fund.bank_details = [{"bank": "City Bank", "account_name": "NSF", "number": 1234}, {"bank": "Islami Bank"}]
    content_migration.copy_bank_details(FakeApps(Fund=SimpleNamespace(objects=Rows([fund]))), None)
    rows = list(FundBankAccount.objects.filter(fund=fund).values_list("bank", "number", "sort_order"))
    assert rows == [("City Bank", "1234", 0), ("Islami Bank", "", 1)]
