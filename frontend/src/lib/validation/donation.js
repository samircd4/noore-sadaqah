/**
 * Donation form rules (docs/DONATION_FLOW.md). The quick-donate panel on the home page uses the short form;
 * the full donate form (F3) extends it.
 */

import { z } from "zod";
import { amountField, mobileField, requiredText } from "./common";

/**
 * @typedef {{ slug: string, min_amount: number }} FundRule
 */

/**
 * Quick-donate: fund, name, mobile, amount. Needs the active funds to check the fund and its minimum.
 * @param {FundRule[]} funds
 */
export function quickDonateSchema(funds) {
  return z
    .object({
      fund: z
        .string("errors.required")
        .min(1, "errors.required")
        .refine((slug) => funds.some((f) => f.slug === slug), "errors.fundInactive"),
      donor_name: requiredText(120),
      donor_phone: mobileField,
      amount: amountField,
    })
    .superRefine((value, ctx) => {
      const fund = funds.find((f) => f.slug === value.fund);
      if (fund && value.amount < fund.min_amount) {
        ctx.addIssue({ code: "custom", path: ["amount"], message: "errors.minAmount", params: { min: fund.min_amount } });
      }
    });
}
