# Payment method logos (footer)

Shown in the footer under the newsletter form, five per row, by `components/layout/PaymentLogos.jsx`.
Which logos appear follows `site.payment_methods` from GET /site/ (the gateways that are live), mapped in
`src/lib/payment-methods.js`.

**These files are placeholders** (the brand name as text). Before launch, replace each file with the official logo
from the brand's media kit, keeping the same file name (SVG preferred; PNG works if you change the extension in
`payment-methods.js`). SSLCommerz also publishes an official "payment methods" image set for merchants.
Official logos keep their own colours (DESIGN_SYSTEM.md "Third-party marks").

| File | Method | Through |
|---|---|---|
| bkash.svg | bKash | bKash Tokenized Checkout |
| nagad.svg | Nagad | SSLCommerz |
| rocket.svg | Rocket (DBBL mobile banking) | SSLCommerz |
| upay.svg | upay | SSLCommerz |
| tap.svg | tap (Trust Axiata Pay) | SSLCommerz |
| visa.svg | Visa | SSLCommerz |
| mastercard.svg | Mastercard | SSLCommerz |
| amex.svg | American Express | SSLCommerz |
| nexus.svg | DBBL Nexus card | SSLCommerz |
| unionpay.svg | UnionPay | SSLCommerz |

Confirm with the foundation's SSLCommerz account which of these are really enabled (CONTENT.md §5) and remove the rest
from `payment-methods.js`.
