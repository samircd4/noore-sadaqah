import io
import secrets

import pytest
import responses
from django.core.cache import cache
from django.core.management import call_command
from rest_framework.test import APIClient

SANDBOX = "https://sandbox.sslcommerz.com"
INIT_URL = f"{SANDBOX}/gwprocess/v4/api.php"
VALIDATE_URL = f"{SANDBOX}/validator/api/validationserverAPI.php"
QUERY_URL = f"{SANDBOX}/validator/api/merchantTransIDvalidationAPI.php"


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()  # throttle counters
    yield
    cache.clear()


@pytest.fixture
def seeded(db):
    """Funds, campaigns and site settings from the frontend fixtures."""
    call_command("seed", stdout=io.StringIO())


@pytest.fixture
def api():
    return APIClient(REMOTE_ADDR="127.0.0.1")


@pytest.fixture
def gateway():
    """Every SSLCommerz call is faked; an unexpected call fails the test (never the real sandbox in CI)."""
    with responses.RequestsMock(assert_all_requests_are_fired=False) as mock:
        yield mock


@pytest.fixture
def valid_body():
    return {
        "fund": "sadaqah",
        "amount": 500,
        "donor_name": "Test Donor",
        "donor_phone": "01712345678",
        "method": "sslcommerz",
        "locale": "bn",
    }


def init_ok(gateway, url="https://sandbox.sslcommerz.com/EasyCheckOut/testcdeabc"):
    gateway.post(INIT_URL, json={"status": "SUCCESS", "sessionkey": "SESS123", "GatewayPageURL": url})


def validation_answer(donation, **overrides):
    return {
        "status": "VALID",
        "tran_id": donation.gateway_ref,
        "val_id": "VAL123",
        "amount": f"{donation.amount}.00",
        "currency": "BDT",
        "currency_type": "BDT",
        "currency_amount": f"{donation.amount}.00",
        "bank_tran_id": f"BANK{donation.gateway_ref}",
        "card_no": "432149XXXXXX0667",
        "store_passwd": secrets.token_hex(8),  # must be removed before saving
        **overrides,
    }
