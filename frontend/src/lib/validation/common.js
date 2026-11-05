/**
 * Field rules shared by every form. Errors are message keys ("errors.mobileInvalid"), translated by the form
 * (docs/I18N.md). Django applies the same rules again on the server; these are for fast feedback.
 */

import { z } from "zod";
import { toLatinDigits } from "@/lib/format";
import { normalizeBdMobile } from "@/lib/phone";

// Lives in lib/phone.js so client code (the mobile menu's phone link) can use it without loading Zod.
export { normalizeBdMobile };

export const MAX_AMOUNT = 10_000_000;

/**
 * Parses a whole-taka amount typed by a person ("১,০০০", "500"), or returns null if it isn't a whole number.
 * @param {unknown} input
 */
export function parseAmount(input) {
  if (typeof input === "number") return Number.isInteger(input) && input >= 0 ? input : null;
  const s = toLatinDigits(String(input ?? "")).replace(/[\s,]/g, "");
  return /^\d+$/.test(s) ? Number(s) : null;
}

export const requiredText = (max = 200) =>
  z.string("errors.required").trim().min(1, "errors.required").max(max, "errors.tooLong");

export const mobileField = z
  .string("errors.required")
  .trim()
  .min(1, "errors.required")
  .refine((v) => normalizeBdMobile(v) !== null, "errors.mobileInvalid")
  .transform((v) => /** @type {string} */ (normalizeBdMobile(v)));

export const emailField = z
  .string("errors.required")
  .trim()
  .min(1, "errors.required")
  .pipe(z.email("errors.emailInvalid"))
  .transform((v) => v.toLowerCase());

/** Whole taka, 1 to MAX_AMOUNT. The fund minimum is checked by the form schema that knows the fund. */
export const amountField = z.union([z.string(), z.number()], "errors.required").transform((value, ctx) => {
  if (value === "" || value === null) {
    ctx.addIssue({ code: "custom", message: "errors.required" });
    return z.NEVER;
  }
  const n = parseAmount(value);
  if (n === null || n < 1) {
    ctx.addIssue({ code: "custom", message: "errors.amountInvalid" });
    return z.NEVER;
  }
  if (n > MAX_AMOUNT) {
    ctx.addIssue({ code: "custom", message: "errors.maxAmount", params: { max: MAX_AMOUNT } });
    return z.NEVER;
  }
  return n;
});
