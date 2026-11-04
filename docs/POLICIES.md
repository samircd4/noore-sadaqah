# Policies — Privacy, Terms, Refund

> **DRAFT. Not legal advice.** These outlines must be reviewed by the foundation's lawyer and
> board, translated into final Bengali, and dated before launch. Payment gateways (SSLCommerz,
> bKash) check for these three pages, plus a visible address and phone number, when approving
> a merchant account, so publish them before applying (even on a temporary site).

Pages: `/privacy` (গোপনীয়তা নীতি), `/terms` (শর্তাবলি), `/refund-policy` (ফেরত নীতি).
Link all three in the footer and from the donate form's consent line.

Fill-ins are in `{braces}` and come from `CONTENT.md`.

---

## 1. Privacy policy — গোপনীয়তা নীতি

**Last updated:** {date}

1. **Who we are.** {Foundation name}, registered as {authority} no. {number}, {address}. Contact: {email}, {phone}.
2. **What we collect.**
   - When you donate: name, mobile number, email (optional), amount, fund, "on behalf of" name, payment method, transaction ID.
   - We **do not** see or store card numbers, bKash PINs or OTPs; the payment gateway handles those.
   - Account: phone/email for the login code.
   - Forms: what you type in the contact, volunteer and newsletter forms.
   - Technical: IP address (for security and rate limiting), cookies (see 6).
3. **Why we use it.** To process the donation, send the receipt by SMS/email, keep accounting records required by law and our auditors, answer messages, and (only if you subscribe) send updates.
4. **Who we share it with.** Only the services needed to run the site: payment gateways ({SSLCommerz, bKash}), the SMS provider, the email provider, hosting/database provider, and auditors or authorities when required by law. **We never sell or rent donor data.**
5. **Public display.** Campaign pages may show your first name and amount. If you tick "নাম প্রকাশ করবেন না", we show "নাম প্রকাশে অনিচ্ছুক". Phone and email are never shown.
6. **Cookies.** Required cookies keep you logged in and remember your language. Analytics cookies (Google Analytics / Meta Pixel) only after you accept the consent banner.
7. **How long we keep it.** Donation records: {N} years, for accounting and audit (TODO: confirm the legal minimum with the accountant). Messages and volunteer forms: {2} years. Newsletter: until you unsubscribe.
8. **Your rights.** You can ask to see, correct or delete your personal data by writing to {email}. We may keep donation records that the law requires us to keep, without using them for marketing.
9. **Security.** HTTPS, limited staff access, every admin change is logged.
10. **Children.** Donors must be 18 or older, or donate with a guardian's permission.
11. **Changes.** We will post changes on this page with a new date.

## 2. Terms of use — শর্তাবলি

**Last updated:** {date}

1. **Acceptance.** By using the site or donating, you agree to these terms.
2. **Donations are voluntary gifts.** You get no goods or services in return. A receipt is issued for each successful donation.
3. **Use of funds.** We use a donation for the fund you choose. If a program is fully funded, cancelled, or can't be carried out, we may use the money for the **closest similar purpose within the same fund**. **Zakat is only ever spent on zakat-eligible recipients** (see the zakat policy) and is never moved to a non-zakat fund.
4. **Admin costs.** TODO: the board decides and states plainly here. For example: "General sadaqah may cover up to {x}% admin costs; zakat is spent according to the Shariah advisor's ruling on 'amil' (collector) share" or "no deduction from zakat."
5. **Monthly giving.** You authorize us to charge the chosen amount every month with the chosen method until you pause or cancel at `/account/recurring` or by contacting us. Cancelling stops future charges; it does not refund past ones.
6. **Accuracy.** You confirm the payment method is yours or that you have permission to use it.
7. **Tax.** TODO: state clearly whether donations are tax-deductible in Bangladesh. If unknown, write: "Please consult your tax adviser; we do not guarantee tax deduction."
8. **Content.** Text, photos and logos belong to the foundation or are used with permission. Do not copy them without permission.
9. **Prohibited use.** No fraud, testing stolen cards, spam, or attacks on the site.
10. **Liability.** We are not liable for delays or failures caused by banks, gateways or mobile operators.
11. **Law.** The laws of Bangladesh apply; courts of {Dhaka}.
12. **Contact.** {email}, {phone}, {address}.

## 3. Refund & cancellation policy — ফেরত নীতি

**Last updated:** {date}

1. **Donations are normally final.** We spend donations quickly for urgent needs, so they are not refunded, except as listed below.
2. **We refund when:**
   - you were charged twice for the same donation, or
   - you were charged a wrong amount because of a technical error, or
   - your card or account was used without your permission (after the bank or gateway confirms), or
   - a monthly charge happened after you cancelled.
3. **How to ask.** Write to {email} or call {phone} **within {7} days** of the payment, with the receipt number (NSF-…) or transaction ID, the amount and the date.
4. **How long it takes.** We reply within {3} working days. Approved refunds go back to the **same method** used to pay: bKash within {7} working days; cards within {7–15} working days, depending on your bank.
5. **Zakat refunds.** TODO: Shariah advisor to confirm. A refund of zakat that has not yet been spent is allowed. Once zakat has been given to a recipient, it can't be refunded.
6. **Cancel monthly giving** at any time at `/account/recurring` or by contacting us. It takes effect before the next charge if done at least {1} day before.
7. **Chargebacks.** Please contact us first; we usually solve it faster than a bank dispute.

---

## Consent line on the donate form

> দান করার মাধ্যমে আপনি আমাদের [শর্তাবলি](/terms), [গোপনীয়তা নীতি](/privacy) ও [ফেরত নীতি](/refund-policy) মেনে নিচ্ছেন।

## Cookie banner text

> আমরা সাইটের ব্যবহার বুঝতে কুকি ব্যবহার করি। [বিস্তারিত](/privacy#cookies)
> Buttons: "গ্রহণ করুন" (gold) · "শুধু প্রয়োজনীয়" (ghost)
