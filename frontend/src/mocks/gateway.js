/**
 * The mock payment gateway: what SSLCommerz / bKash plus Django's callbacks and `mark_paid()` do, for
 * API_MODE=mock only. Used by the mock donation routes and by the mock-only page /donate/mock-gateway
 * (frontend/CLAUDE.md "Mock API" rule 2: the one page allowed to touch src/mocks/).
 */

import { createHmac } from "node:crypto";
import { store } from "./store";

/** Mock stand-in for RECEIPT_TOKEN_SECRET. Not a secret: the mock's receipt links don't open anything. */
const MOCK_RECEIPT_SECRET = "mock-receipt-secret";
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

/** First `length` base32 characters of some bytes. */
function base32(bytes, length) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < length) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out;
}

/**
 * The short signed receipt link `/r/{gateway_ref}-{sig}` (API.md "Receipts"). Django serves /r/; in mock mode
 * nothing does, so the link is only there to show the right shape.
 * @param {string} gatewayRef
 */
export function receiptUrl(gatewayRef) {
  const sig = base32(createHmac("sha256", MOCK_RECEIPT_SECRET).update(gatewayRef).digest(), 10);
  return `/r/${gatewayRef}-${sig}`;
}

/** Year in Asia/Dhaka (receipt numbers count per Dhaka year). */
const dhakaYear = (date) => Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Dhaka" }).format(date));

/**
 * Like Django's `mark_paid()`: PAID, paid_at and the next receipt number `NSF-{year}-{6 digits}`, once.
 * Already PAID → nothing changes (idempotent). A FAILED donation may still become PAID (late confirmation); a
 * CANCELLED one is not changed (DONATION_FLOW.md rule 4).
 * @param {any} donation
 */
function markPaid(donation) {
  if (donation.status === "paid" || donation.status === "cancelled") return;
  const now = new Date();
  const year = dhakaYear(now);
  const next = (store.receiptCounters.get(year) ?? 0) + 1;
  store.receiptCounters.set(year, next);
  donation.status = "paid";
  donation.paid_at = now.toISOString();
  donation.receipt_no = `NSF-${year}-${String(next).padStart(6, "0")}`;
  donation.fail_reason = null;

  const subscription = donation.subscription ? store.subscriptions.get(donation.subscription) : null;
  if (subscription && subscription.status === "pending") {
    const nextCharge = new Date(now);
    nextCharge.setUTCMonth(nextCharge.getUTCMonth() + 1);
    subscription.status = "active";
    subscription.next_charge_on = nextCharge.toISOString().slice(0, 10);
  }
}

/** @typedef {"success" | "fail" | "cancel" | "pending"} MockOutcome */

export const MOCK_OUTCOMES = /** @type {const} */ (["success", "fail", "cancel", "pending"]);

/** Public facts the mock gateway page shows (no personal data beyond what a gateway page shows). */
export function mockGatewayDonation(id) {
  const d = store.donations.get(String(id ?? ""));
  return d ? { id: d.id, amount: d.amount, method: d.method, status: d.status, locale: d.locale, gateway_ref: d.gateway_ref } : null;
}

/**
 * Settles a mock donation like the gateway callback would, and returns where Django would 303 the browser:
 * `/{locale}/donate/success?id=` or `/{locale}/donate/failed?id=` (API.md "Payment gateway callbacks").
 * A PENDING donation takes any outcome. A FAILED one can still be confirmed by "success" (a late confirmation,
 * DONATION_FLOW.md rule 4); PAID and CANCELLED never change. Repeating a callback is harmless.
 * @param {string} id
 * @param {MockOutcome} outcome
 * @returns {string | null} redirect path, or null for an unknown id
 */
export function settleMockDonation(id, outcome) {
  const d = store.donations.get(id);
  if (!d) return null;
  if (d.status === "failed" && outcome === "success") markPaid(d);
  else if (d.status === "pending") {
    if (outcome === "success") markPaid(d);
    else if (outcome === "fail") {
      d.status = "failed";
      d.fail_reason = { bn: "পেমেন্ট প্রত্যাখ্যাত হয়েছে (নমুনা গেটওয়ে)", en: "The payment was declined (mock gateway)" };
    } else if (outcome === "cancel") {
      d.status = "cancelled";
      d.fail_reason = { bn: "আপনি পেমেন্ট বাতিল করেছেন", en: "You cancelled the payment" };
    }
  }
  const page = d.status === "paid" || d.status === "pending" ? "success" : "failed";
  return `/${d.locale === "en" ? "en" : "bn"}/donate/${page}?id=${d.id}`;
}
