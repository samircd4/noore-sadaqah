"""The receipt email (NOTIFICATIONS.md "Email templates", backend/CLAUDE.md rules 5, 6 and 8)."""

import smtplib
from datetime import timedelta

import pytest
from django.utils import timezone

from content.models import Fund
from donations.models import Donation, Status
from donations.services import mark_paid
from notifications.models import OutboundMessage
from notifications.tasks import send_receipt

pytestmark = pytest.mark.usefixtures("seeded")

EMAIL = "donor@example.com"


@pytest.fixture(autouse=True)
def fake_pdf(monkeypatch):
    """The real PDF is tested in test_receipts.py; here it only has to be attached."""
    monkeypatch.setattr("notifications.emails.receipt_pdf", lambda donation: b"%PDF-1.7 fake")


def pending(**extra):
    extra = {"donor_email": EMAIL, "amount": 1500, **extra}
    return Donation.objects.create(
        fund=Fund.objects.get(slug="sadaqah"), donor_name="Test Donor", donor_phone="01712345678",
        method="sslcommerz", **extra,
    )  # fmt: skip


def pay(donation, capture):
    with capture(execute=True):
        paid, _ = mark_paid(donation.pk, txn_id=f"BANK{donation.gateway_ref}", payload={})
    return paid


class TestQueuedByMarkPaid:
    def test_paid_donation_gets_one_email_after_commit(self, django_capture_on_commit_callbacks, mailoutbox):
        donation = pay(pending(), django_capture_on_commit_callbacks)
        assert len(mailoutbox) == 1
        email = mailoutbox[0]
        assert email.to == [EMAIL]
        assert email.subject == f"দানের রসিদ {donation.receipt_no}"  # receipt numbers keep English digits
        assert email.attachments == [(f"receipt-{donation.receipt_no}.pdf", b"%PDF-1.7 fake", "application/pdf")]
        html, mimetype = email.alternatives[0]
        assert mimetype == "text/html" and "৳১,৫০০" in html and "নূরে সাদাকাহ ফাউন্ডেশন" in html
        assert "৳১,৫০০" in email.body  # the plain-text version is always there
        assert "http://testserver/bn/account" in email.body

        message = OutboundMessage.objects.get(donation=donation)
        assert (message.channel, message.template, message.status) == ("email", "receipt", "sent")
        assert message.provider_ref == email.extra_headers["Message-ID"]

    def test_nothing_is_queued_before_the_commit(self, django_capture_on_commit_callbacks, mailoutbox):
        with django_capture_on_commit_callbacks() as callbacks:  # not executed: the transaction "never commits"
            mark_paid(pending().pk, txn_id="T1", payload={})
        assert len(callbacks) == 1 and mailoutbox == []

    def test_no_email_address_no_task(self, django_capture_on_commit_callbacks, mailoutbox):
        with django_capture_on_commit_callbacks() as callbacks:
            mark_paid(pending(donor_email="").pk, txn_id="T2", payload={})
        assert callbacks == [] and mailoutbox == []

    def test_second_mark_paid_queues_nothing(self, django_capture_on_commit_callbacks, mailoutbox):
        donation = pay(pending(), django_capture_on_commit_callbacks)
        with django_capture_on_commit_callbacks() as callbacks:
            mark_paid(donation.pk, txn_id="T3", payload={})
        assert callbacks == [] and len(mailoutbox) == 1

    def test_english_donor_gets_english(self, django_capture_on_commit_callbacks, mailoutbox):
        donation = pay(pending(locale="en"), django_capture_on_commit_callbacks)
        email = mailoutbox[0]
        assert email.subject == f"Donation receipt {donation.receipt_no}"
        assert "৳1,500" in email.body and "http://testserver/en/account" in email.body


class TestTask:
    def test_running_twice_sends_once(self, django_capture_on_commit_callbacks, mailoutbox):
        donation = pay(pending(), django_capture_on_commit_callbacks)
        assert send_receipt.delay(str(donation.pk)).get() == "already_sent"
        assert len(mailoutbox) == 1 and OutboundMessage.objects.count() == 1

    @pytest.mark.parametrize("state", [Status.PENDING, Status.FAILED])
    def test_unpaid_donation_is_skipped(self, state, mailoutbox):
        donation = pending(status=state)
        assert send_receipt.delay(str(donation.pk)).get() == "skipped"
        assert mailoutbox == [] and not OutboundMessage.objects.exists()

    def test_without_pdf_the_email_has_the_receipt_link(
        self, monkeypatch, django_capture_on_commit_callbacks, mailoutbox
    ):
        def no_pango(donation):
            raise OSError("cannot load library 'pango'")

        monkeypatch.setattr("notifications.emails.receipt_pdf", no_pango)
        donation = pay(pending(), django_capture_on_commit_callbacks)
        email = mailoutbox[0]
        assert email.attachments == []
        assert f"http://testserver/r/{donation.gateway_ref}-" in email.body

    def test_mail_server_down_is_retried_then_recorded_once(self, monkeypatch, mailoutbox):
        tries, retries = [], []

        def down(*args, **kwargs):
            tries.append(1)
            raise ConnectionRefusedError

        class RetryLater(Exception):
            pass

        def retry(countdown):
            retries.append(countdown)
            return RetryLater()

        monkeypatch.setattr("notifications.tasks.send_email", down)
        monkeypatch.setattr(send_receipt, "retry", retry)
        donation = pending()
        mark_paid(donation.pk, txn_id="T4", payload={})  # on_commit doesn't run here; start the task by hand

        with pytest.raises(RetryLater):
            send_receipt(str(donation.pk))
        assert retries == [60]  # the next try in 1 minute
        monkeypatch.setattr(send_receipt, "max_retries", 0)  # stands in for the last retry: no more after it
        assert send_receipt(str(donation.pk)) == "failed"

        assert len(tries) == 2 and retries == [60]
        message = OutboundMessage.objects.get(donation=donation)  # one row for all the tries
        assert (message.status, message.error) == ("failed", "ConnectionRefusedError")

    @pytest.mark.parametrize(
        "error",
        [
            smtplib.SMTPRecipientsRefused({EMAIL: (550, b"no such user")}),
            smtplib.SMTPDataError(554, b"message rejected"),
            smtplib.SMTPSenderRefused(553, b"sender not allowed", "receipts@nooresadaqah.org"),
        ],
    )
    def test_permanent_refusal_is_not_retried(self, monkeypatch, mailoutbox, error):
        tries = []

        def refused(*args, **kwargs):
            tries.append(1)
            raise error

        monkeypatch.setattr("notifications.tasks.send_email", refused)
        donation = pending()
        mark_paid(donation.pk, txn_id="T5", payload={})
        assert send_receipt.apply(args=[str(donation.pk)]).get() == "failed"
        assert len(tries) == 1
        assert OutboundMessage.objects.get(donation=donation).error == type(error).__name__  # no address in it

    def test_any_other_error_is_recorded_and_retried(self, monkeypatch, mailoutbox):
        """A template or settings mistake must not lose the record, and its text (which may hold the address)
        must not reach the logs."""
        retries = []

        def broken(donation):
            raise ValueError(f"cannot render for {EMAIL}")

        class RetryLater(Exception):
            pass

        monkeypatch.setattr("notifications.tasks.receipt_email", broken)
        monkeypatch.setattr(send_receipt, "retry", lambda countdown: retries.append(countdown) or RetryLater())
        donation = pending()
        mark_paid(donation.pk, txn_id="T6", payload={})
        with pytest.raises(RetryLater):
            send_receipt(str(donation.pk))
        assert retries == [60]
        message = OutboundMessage.objects.get(donation=donation)
        assert (message.status, message.error) == ("failed", "ValueError")

    def test_receipt_being_sent_by_another_worker_is_looked_at_later(self, monkeypatch, mailoutbox):
        class RetryLater(Exception):
            pass

        retries = []
        monkeypatch.setattr(send_receipt, "retry", lambda countdown: retries.append(countdown) or RetryLater())
        donation = pending()
        mark_paid(donation.pk, txn_id="T7", payload={})
        OutboundMessage.objects.create(donation=donation, channel="email", template="receipt", to=EMAIL)  # queued now
        with pytest.raises(RetryLater):
            send_receipt(str(donation.pk))
        assert retries == [600] and mailoutbox == []

    def test_receipt_left_queued_by_a_dead_worker_is_sent(self, mailoutbox):
        donation = pending()
        mark_paid(donation.pk, txn_id="T8", payload={})
        stuck = OutboundMessage.objects.create(donation=donation, channel="email", template="receipt", to=EMAIL)
        OutboundMessage.objects.filter(pk=stuck.pk).update(updated_at=timezone.now() - timedelta(minutes=11))
        assert send_receipt(str(donation.pk)) == "sent"
        assert len(mailoutbox) == 1 and OutboundMessage.objects.get().status == "sent"

    def test_pdf_error_of_any_kind_falls_back_to_the_link(
        self, monkeypatch, django_capture_on_commit_callbacks, mailoutbox
    ):
        def bad_font(donation):
            raise ValueError("bad font")

        monkeypatch.setattr("notifications.emails.receipt_pdf", bad_font)
        donation = pay(pending(), django_capture_on_commit_callbacks)
        assert mailoutbox[0].attachments == []
        assert f"/r/{donation.gateway_ref}-" in mailoutbox[0].body

    def test_logs_carry_no_address_or_name(self, caplog, django_capture_on_commit_callbacks, mailoutbox):
        caplog.set_level("INFO")
        pay(pending(), django_capture_on_commit_callbacks)
        assert "receipt email for donation" in caplog.text
        assert EMAIL not in caplog.text and "Test Donor" not in caplog.text
