"""
Sending email (docs/NOTIFICATIONS.md). EMAIL_PROVIDER in .env picks how:
  smtp     any SMTP server: Mailpit in development (root compose.yaml), the real mail server in production
  console  print the email in the Celery log
Changing provider or mail server is a .env change only; callers use send_email() and never see the difference.
SMS comes later (ROADMAP B2) behind the same kind of function.
"""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, make_msgid


def send_email(to, subject, html, text, attachments=()):
    """Send one email with an HTML and a plain-text version. attachments: (filename, bytes, mimetype).
    Returns the Message-ID (kept on the OutboundMessage). Raises smtplib.SMTPException or OSError on failure."""
    message_id = make_msgid(domain=settings.EMAIL_MESSAGE_ID_DOMAIN)
    email = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [to], headers={"Message-ID": message_id})
    email.attach_alternative(html, "text/html")
    for filename, content, mimetype in attachments:
        email.attach(filename, content, mimetype)
    email.send()
    return message_id
