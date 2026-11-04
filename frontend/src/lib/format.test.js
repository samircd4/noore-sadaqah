import { describe, expect, it } from "vitest";
import { bnDate, bnDigits, bnNumber, shortNumber, taka, toLatinDigits } from "./format";

describe("bnNumber", () => {
  it("uses Bengali digits and lakh grouping", () => {
    expect(bnNumber(12500)).toBe("১২,৫০০");
    expect(bnNumber(100000)).toBe("১,০০,০০০");
    expect(bnNumber(0)).toBe("০");
  });

  it("uses Latin digits for English", () => {
    expect(bnNumber(12500, "en")).toBe("12,500");
    expect(bnNumber(100000, "en")).toBe("100,000");
  });

  it("falls back to Bengali for unknown locales", () => {
    expect(bnNumber(500, "fr")).toBe("৫০০");
  });
});

describe("taka", () => {
  it("puts the taka sign before the amount", () => {
    expect(taka(1000)).toBe("৳১,০০০");
    expect(taka(1000, "en")).toBe("৳1,000");
    expect(taka(320000)).toBe("৳৩,২০,০০০");
  });
});

describe("bnDate", () => {
  it("formats in Asia/Dhaka without a comma", () => {
    expect(bnDate("2026-10-20T10:00:00Z")).toBe("২০ অক্টোবর ২০২৬");
    expect(bnDate("2026-10-20T10:00:00Z", "en")).toBe("20 October 2026");
  });

  it("uses the Dhaka date, not UTC", () => {
    // 20:00 UTC on 31 Dec is already 1 Jan in Dhaka (UTC+6)
    expect(bnDate("2026-12-31T20:00:00Z", "en")).toBe("1 January 2027");
  });
});

describe("shortNumber", () => {
  it("uses lakh and crore in Bengali", () => {
    expect(shortNumber(100000)).toBe("১ লক্ষ");
    expect(shortNumber(150000)).toBe("১.৫ লক্ষ");
    expect(shortNumber(12000000)).toBe("১.২ কোটি");
  });

  it("keeps smaller numbers in full", () => {
    expect(shortNumber(12500)).toBe("১২,৫০০");
    expect(shortNumber(3200)).toBe("৩,২০০");
  });

  it("uses compact notation in English", () => {
    expect(shortNumber(100000, "en")).toBe("100K");
    expect(shortNumber(1500000, "en")).toBe("1.5M");
    expect(shortNumber(3200, "en")).toBe("3,200");
  });
});

describe("toLatinDigits", () => {
  it("converts Bengali digits", () => {
    expect(toLatinDigits("১০০০")).toBe("1000");
    expect(toLatinDigits("০১৭১২৩৪৫৬৭৮")).toBe("01712345678");
  });

  it("leaves other characters alone", () => {
    expect(toLatinDigits("+৮৮০ 17")).toBe("+880 17");
    expect(toLatinDigits("abc")).toBe("abc");
  });

  it("handles empty input", () => {
    expect(toLatinDigits("")).toBe("");
    expect(toLatinDigits(null)).toBe("");
    expect(toLatinDigits(undefined)).toBe("");
  });
});

describe("bnDigits", () => {
  it("converts digits without grouping (years, ids)", () => {
    expect(bnDigits(2026)).toBe("২০২৬");
    expect(bnDigits(2026, "en")).toBe("2026");
    expect(bnDigits("NS-0042")).toBe("NS-০০৪২");
  });
});
