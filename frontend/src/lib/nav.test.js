import { describe, expect, it } from "vitest";
import { DONATE_HREF, fundDonateHref } from "./nav";

describe("fundDonateHref", () => {
  it("links to the fund page with only the options given", () => {
    expect(fundDonateHref("orphan")).toEqual({ pathname: "/donate/orphan", query: {} });
    expect(fundDonateHref("orphan", { amount: 1000, campaign: "orphan-smile", monthly: true })).toEqual({
      pathname: "/donate/orphan",
      query: { amount: 1000, campaign: "orphan-smile", monthly: 1 },
    });
  });

  it("falls back to the fund list without a fund", () => {
    expect(fundDonateHref(null, { amount: 500 })).toBe(DONATE_HREF);
    expect(DONATE_HREF).toBe("/donate");
  });
});
