/**
 * Donation form rules (docs/DONATION_FLOW.md, docs/API.md "POST /donations/"). The quick-donate panel on the home
 * page uses the short schema; the donate form, the checkout's server action and the mock API use the full one.
 * Django applies the same rules again: these are for fast feedback.
 */

import { z } from "zod";
import { amountField, mobileField, requiredText } from "./common";

/** Gateways the donor can pick (API.md `method`): bKash, or SSLCommerz for cards and other wallets. */
export const PAYMENT_METHODS = /** @type {const} */ (["bkash", "sslcommerz"]);

export const DONATION_KINDS = /** @type {const} */ (["one_time", "monthly"]);

/**
 * @typedef {{ slug: string, min_amount: number, allow_recurring?: boolean }} FundRule
 */

/** @param {FundRule[]} funds */
const fundField = (funds) =>
  z
    .string("errors.required")
    .min(1, "errors.required")
    .refine((slug) => funds.some((f) => f.slug === slug), "errors.fundInactive");

/** Adds `minAmount` when the amount is below the chosen fund's minimum. */
function checkMinimum(funds, value, ctx) {
  const fund = funds.find((f) => f.slug === value.fund);
  if (fund && typeof value.amount === "number" && value.amount < fund.min_amount) {
    ctx.addIssue({ code: "custom", path: ["amount"], message: "errors.minAmount", params: { min: fund.min_amount } });
  }
}

/**
 * Quick-donate: fund, name, mobile, amount. Needs the active funds to check the fund and its minimum.
 * @param {FundRule[]} funds
 */
export function quickDonateSchema(funds) {
  return z
    .object({
      fund: fundField(funds),
      donor_name: requiredText(120),
      donor_phone: mobileField,
      amount: amountField,
    })
    .superRefine((value, ctx) => checkMinimum(funds, value, ctx));
}

const emailSchema = z.email();

/** Optional email: "" when empty, lower-cased otherwise. */
const optionalEmail = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((v) => v === "" || emailSchema.safeParse(v).success, "errors.emailInvalid")
  .transform((v) => v.toLowerCase());

/**
 * The full donation (`POST /donations/` body). Used by DonateForm, the createDonation server action and the mock.
 * Fitra fields are not here: the fitra form waits for ZAKAT_POLICY.md sign-off, and the API refuses fitra until then.
 * @param {FundRule[]} funds
 */
export function donationSchema(funds) {
  return z
    .object({
      fund: fundField(funds),
      campaign: z.string().trim().max(80, "errors.tooLong").optional().default(""),
      amount: amountField,
      kind: z.enum(DONATION_KINDS, "errors.choiceInvalid").optional().default("one_time"),
      donor_name: requiredText(120),
      donor_phone: mobileField,
      donor_email: optionalEmail,
      on_behalf_of: z.string().trim().max(120, "errors.tooLong").optional().default(""),
      on_behalf_permission: z.boolean().optional().default(false),
      is_anonymous: z.boolean().optional().default(false),
      method: z.string("errors.required").min(1, "errors.required").pipe(z.enum(PAYMENT_METHODS, "errors.choiceInvalid")),
      locale: z.enum(["bn", "en"]).optional().default("bn"),
    })
    .superRefine((value, ctx) => {
      checkMinimum(funds, value, ctx);
      const fund = funds.find((f) => f.slug === value.fund);
      if (fund && value.kind === "monthly" && !fund.allow_recurring) {
        ctx.addIssue({ code: "custom", path: ["kind"], message: "errors.recurringNotAllowed" });
      }
      if (value.on_behalf_of && !value.on_behalf_permission) {
        ctx.addIssue({ code: "custom", path: ["on_behalf_permission"], message: "errors.onBehalfPermission" });
      }
    });
}
