import { describe, expect, it } from "vitest";
import { normalizeBdMobile, parseAmount } from "./common";
import { quickDonateSchema } from "./donation";
import { subscriberSchema } from "./forms";

// Cases from docs/QA_CHECKLIST.md §3.
describe("normalizeBdMobile", () => {
  it("accepts valid numbers in every common form", () => {
    expect(normalizeBdMobile("01712345678")).toBe("01712345678");
    expect(normalizeBdMobile("+8801712345678")).toBe("01712345678");
    expect(normalizeBdMobile("8801712345678")).toBe("01712345678");
    expect(normalizeBdMobile("০১৭১২৩৪৫৬৭৮")).toBe("01712345678");
    expect(normalizeBdMobile("+৮৮০১৭১২৩৪৫৬৭৮")).toBe("01712345678");
    expect(normalizeBdMobile("01712-345678")).toBe("01712345678");
  });

  it("rejects wrong numbers", () => {
    expect(normalizeBdMobile("0171234567")).toBeNull(); // 10 digits
    expect(normalizeBdMobile("02123456789")).toBeNull(); // landline
    expect(normalizeBdMobile("01212345678")).toBeNull(); // no 012 operator
    expect(normalizeBdMobile("")).toBeNull();
  });
});

describe("parseAmount", () => {
  it("parses whole numbers in either script", () => {
    expect(parseAmount("1000")).toBe(1000);
    expect(parseAmount("১০০০")).toBe(1000);
    expect(parseAmount("১,০০০")).toBe(1000);
    expect(parseAmount(500)).toBe(500);
  });

  it("rejects anything else", () => {
    expect(parseAmount("10.5")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("1e9")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(10.5)).toBeNull();
  });
});

describe("quickDonateSchema", () => {
  const schema = quickDonateSchema([
    { slug: "sadaqah", min_amount: 10 },
    { slug: "orphan", min_amount: 500 },
  ]);
  const valid = { fund: "sadaqah", donor_name: "রহিম", donor_phone: "০১৭১২৩৪৫৬৭৮", amount: "১০০০" };

  const issues = (input) =>
    schema.safeParse(input).error?.issues.map((i) => ({ path: i.path.join("."), message: i.message, params: i.params })) ?? [];

  it("accepts and normalises a valid donation", () => {
    expect(schema.parse(valid)).toEqual({ fund: "sadaqah", donor_name: "রহিম", donor_phone: "01712345678", amount: 1000 });
  });

  it("returns message keys for empty fields", () => {
    const result = issues({ fund: "", donor_name: " ", donor_phone: "", amount: "" });
    expect(result.map((r) => `${r.path}:${r.message}`)).toEqual(
      expect.arrayContaining(["fund:errors.required", "donor_name:errors.required", "donor_phone:errors.required", "amount:errors.required"]),
    );
  });

  it("checks the fund minimum with its value as a param", () => {
    expect(issues({ ...valid, fund: "orphan", amount: "100" })).toEqual([
      { path: "amount", message: "errors.minAmount", params: { min: 500 } },
    ]);
  });

  it("rejects unknown funds and bad amounts", () => {
    expect(issues({ ...valid, fund: "unknown" })[0].message).toBe("errors.fundInactive");
    expect(issues({ ...valid, amount: "10.5" })[0].message).toBe("errors.amountInvalid");
    expect(issues({ ...valid, amount: "-5" })[0].message).toBe("errors.amountInvalid");
    expect(issues({ ...valid, amount: "1e9" })[0].message).toBe("errors.amountInvalid");
    expect(issues({ ...valid, amount: "99999999" })[0].message).toBe("errors.maxAmount");
  });
});

describe("subscriberSchema", () => {
  it("lower-cases a valid email", () => {
    expect(subscriberSchema.parse({ email: " Donor@Example.com " })).toEqual({ email: "donor@example.com" });
  });

  it("rejects empty and invalid emails", () => {
    expect(subscriberSchema.safeParse({ email: "" }).error.issues[0].message).toBe("errors.required");
    expect(subscriberSchema.safeParse({ email: "not-an-email" }).error.issues[0].message).toBe("errors.emailInvalid");
  });
});
