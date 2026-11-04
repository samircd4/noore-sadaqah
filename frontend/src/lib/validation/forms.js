/**
 * Contact, volunteer and newsletter form rules (docs/API.md "Forms"). The mock API and the server actions use the
 * same schemas; Django applies the same rules again.
 */

import { z } from "zod";
import { DISTRICT_SLUGS } from "@/lib/districts";
import { emailField, mobileField, normalizeBdMobile, requiredText } from "./common";

export const subscriberSchema = z.object({
  email: emailField,
});

/** The same email rule as `emailField` (z.email), for fields where an email is optional or one of two choices. */
const isEmail = (value) => z.email().safeParse(value).success;

/** A BD mobile (normalised to 01XXXXXXXXX) or an email (lower-cased), else `contactInvalid`. */
const phoneOrEmailField = requiredText(120).transform((value, ctx) => {
  const mobile = normalizeBdMobile(value);
  if (mobile) return mobile;
  if (isEmail(value)) return value.toLowerCase();
  ctx.addIssue({ code: "custom", message: "errors.contactInvalid" });
  return z.NEVER;
});

/** Optional free text: trimmed, "" when left empty. */
const optionalText = (max) => z.string().trim().max(max, "errors.tooLong").optional().default("");

export const contactSchema = z.object({
  name: requiredText(120),
  contact: phoneOrEmailField,
  subject: requiredText(150),
  message: requiredText(2000),
});

export const AVAILABILITY = /** @type {const} */ (["weekdays", "weekends", "flexible"]);

export const volunteerSchema = z.object({
  name: requiredText(120),
  phone: mobileField,
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => v === "" || isEmail(v), "errors.emailInvalid")
    .transform((v) => v.toLowerCase()),
  district: z
    .string("errors.required")
    .min(1, "errors.required")
    .refine((v) => DISTRICT_SLUGS.includes(v), "errors.districtInvalid"),
  skills: optionalText(500),
  availability: z
    .string()
    .optional()
    .default("")
    .refine((v) => v === "" || AVAILABILITY.includes(/** @type {any} */ (v)), "errors.choiceInvalid"),
});
