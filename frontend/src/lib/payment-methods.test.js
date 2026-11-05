import { describe, expect, it } from "vitest";
import { paymentLogos } from "./payment-methods";

describe("paymentLogos", () => {
  it("shows bKash first, then everything SSLCommerz carries: ten logos", () => {
    const logos = paymentLogos(["bkash", "sslcommerz"]);
    expect(logos).toHaveLength(10);
    expect(logos.map((l) => l.key).slice(0, 5)).toEqual(["bkash", "nagad", "rocket", "upay", "tap"]);
    expect(logos.every((l) => l.src.startsWith("/payments/") && l.name)).toBe(true);
  });

  it("shows only the methods of live gateways", () => {
    expect(paymentLogos(["bkash"]).map((l) => l.key)).toEqual(["bkash"]);
    expect(paymentLogos([])).toEqual([]);
    expect(paymentLogos(undefined)).toEqual([]);
    expect(paymentLogos(["unknown"])).toEqual([]);
  });
});
