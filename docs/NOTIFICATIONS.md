# Notifications: SMS and email

All messages are sent by **Celery tasks** in `notifications/` (never inline in a request) and recorded as an
`OutboundMessage` row. Provider code sits behind one interface so the SMS company can change without touching callers:

```python
# notifications/providers.py
class SmsProvider:   def send(self, to: str, text: str) -> SendResult: ...   # console | sslwireless | bulksmsbd | …
class EmailProvider: def send(self, to, subject, html, text, attachments=()) -> SendResult: ...  # console | resend | smtp
```

- Retries: 3 times with backoff (1, 5, 30 minutes) on network/5xx errors; no retry on "invalid number".
- Language: `donation.locale` or `user.preferred_locale`. Templates live in `backend/templates/sms/<name>.<lang>.txt`
  and `backend/templates/emails/<name>.<lang>.html` (+ `.txt`).
- Numbers in SMS use Bengali digits for amounts in `bn`, **but OTP codes and receipt numbers stay in English digits**
  (easier to type and search).
- Never log the text of an OTP SMS. `OutboundMessage` for OTP stores the template name, not the code.

## SMS length and cost

Bengali SMS are Unicode (UCS-2): **70 characters for one SMS, 67 per part** when longer. English (GSM-7): 160 / 153.
Each part is billed. Keep every Bengali SMS to **one part where possible, two at most**.
`notifications/sms.py::segments(text)` counts parts; a unit test fails if a rendered template (with the longest
realistic values) goes over its budget below.

Links in SMS use the **short receipt link** `https://nooresadaqah.org/r/<code>` (API.md "Receipts"), never the long signed URL.

## SMS templates

| Name | When | `bn` text | Budget |
|---|---|---|---|
| `otp` | OTP request | `নূরে সাদাকাহ লগইন কোড: {code}। ৫ মিনিট বৈধ। কাউকে বলবেন না।` | 1 part |
| `receipt` | Donation PAID (online or offline with SMS ticked) | `জাযাকাল্লাহু খাইরান! {amount} দান গৃহীত। রসিদ: {short_link}` | 2 parts |
| `monthly_reminder` | REMINDER plan due | `আপনার মাসিক দান {amount} ({fund})। দিতে: {pay_link}` | 2 parts |
| `monthly_reminder_2` | 3 days later, still unpaid | `মনে করিয়ে দিচ্ছি: মাসিক দান {amount}। {pay_link}` | 2 parts |
| `monthly_failed` | Plan becomes FAILED | `আপনার মাসিক দান বন্ধ হয়েছে (পেমেন্ট সফল হয়নি)। চালু করতে: {account_link}` | 2 parts |
| `refund` | Marked REFUNDED | `আপনার দান {amount} (রসিদ {receipt_no}) ফেরত দেওয়া হয়েছে।` | 1 part |

English versions (`*.en.txt`), for example `otp`: `Noore Sadaqah login code: {code}. Valid 5 minutes. Don't share it.`
The final wording of every Bengali template needs the foundation's approval before launch (CONTENT.md).

## Email templates

| Name | When | Subject (`bn`) | Content |
|---|---|---|---|
| `receipt` | PAID, if an email was given | `দানের রসিদ {receipt_no}` | Thanks, amount, fund, date, PDF **attached**, link to `/{locale}/account` |
| `otp` | Email login | `লগইন কোড: {code}` | Code, validity, "if this wasn't you, ignore this email" |
| `monthly_reminder` | REMINDER plan due | `আপনার মাসিক দান` | Amount, fund, pay button, link to manage the plan |
| `monthly_failed` | Plan FAILED | `মাসিক দান বন্ধ হয়েছে` | What happened, how to restart |
| `refund` | REFUNDED | `দান ফেরত` | Amount, receipt no., refund reference |
| `contact_copy` | Contact form | `আপনার বার্তা পেয়েছি` | Copy of the message (only if the contact field is an email) |

Email layout: one simple HTML template (`emails/base.html`), palette colors inline, logo, foundation address and
registration number in the footer, plain-text alternative always included.

## Staff alerts (email to `ADMIN_ALERT_EMAIL`)

| Alert | Trigger |
|---|---|
| Amount or currency mismatch in a callback | `GatewayEvent` with mismatch |
| CANCELLED donation confirmed as paid later | `mark_paid` refused |
| Nisab price older than 30 days | weekly task |
| Weekly reconciliation report | Monday 09:00 |
| OTP SMS spike (> 200/hour) or card-testing pattern | SECURITY.md §2, §6 |
| Backup missing | daily check |
