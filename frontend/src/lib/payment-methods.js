/**
 * Payment method logos for the footer. GET /site/ lists the live gateways in `payment_methods`
 * (`["bkash", "sslcommerz"]`, API.md); each gateway carries the methods below, so the footer only shows logos for
 * gateways that really work (CONTENT.md §5). Files and how to replace the placeholders: public/payments/README.md.
 */

/** @type {Record<string, { name: string, src: string }>} */
export const PAYMENT_LOGOS = {
  bkash: { name: "bKash", src: "/payments/bkash.svg" },
  nagad: { name: "Nagad", src: "/payments/nagad.svg" },
  rocket: { name: "Rocket", src: "/payments/rocket.svg" },
  upay: { name: "upay", src: "/payments/upay.svg" },
  tap: { name: "tap", src: "/payments/tap.svg" },
  visa: { name: "Visa", src: "/payments/visa.svg" },
  mastercard: { name: "Mastercard", src: "/payments/mastercard.svg" },
  amex: { name: "American Express", src: "/payments/amex.svg" },
  nexus: { name: "DBBL Nexus", src: "/payments/nexus.svg" },
  unionpay: { name: "UnionPay", src: "/payments/unionpay.svg" },
};

/** Methods each gateway carries: mobile banking first, then cards (two rows of five in the footer). */
const GATEWAY_METHODS = {
  bkash: ["bkash"],
  sslcommerz: ["nagad", "rocket", "upay", "tap", "visa", "mastercard", "amex", "nexus", "unionpay"],
};

/**
 * Logos to show for the live gateways, in display order, without duplicates.
 * @param {string[] | undefined} gateways `site.payment_methods`
 * @returns {Array<{ key: string, name: string, src: string }>}
 */
export function paymentLogos(gateways) {
  const keys = [...new Set((gateways ?? []).flatMap((g) => GATEWAY_METHODS[g] ?? []))];
  return keys.map((key) => ({ key, ...PAYMENT_LOGOS[key] }));
}
