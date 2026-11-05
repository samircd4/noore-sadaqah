"use server";

/**
 * Server actions for the small public forms (frontend/CLAUDE.md rule 4):
 * validate with Zod, call the API, map errors to message keys.
 * Result: { ok: true } or { ok: false, fieldErrors?, error?, values } (keys like "errors.emailInvalid").
 */

import { apiRequest } from "@/lib/api";
import { ApiError, errorKey, fromZodError, toFieldErrors } from "@/lib/api-errors";
import { contactSchema, subscriberSchema, volunteerSchema } from "@/lib/validation/forms";

/** @param {FormData} formData @param {string} name */
const text = (formData, name) => String(formData.get(name) ?? "");

/**
 * Newsletter sign-up in the footer. Used with useActionState.
 * @param {unknown} _previous
 * @param {FormData} formData
 */
export async function subscribe(_previous, formData) {
  const locale = formData.get("locale") === "en" ? "en" : "bn";
  return submitForm(subscriberSchema, "/subscribers/", { email: text(formData, "email") }, locale);
}

/**
 * Validates `fields` with `schema`, posts them to `path`, and returns the form result shape.
 * @param {import("zod").ZodType} schema
 * @param {string} path
 * @param {Record<string, unknown>} fields
 * @param {"bn" | "en"} locale
 * @returns {Promise<{ ok: true } | { ok: false, fieldErrors?: object, error?: string, values: Record<string, unknown> }>}
 */
async function submitForm(schema, path, fields, locale) {
  // On failure the typed values go back to the form: React 19 resets a form after its action, so the fields
  // refill from `values` (defaultValue) instead of making the visitor type everything again.
  const parsed = schema.safeParse(fields);
  if (!parsed.success) return { ok: false, fieldErrors: fromZodError(parsed.error), values: fields };
  try {
    await apiRequest(path, { method: "POST", body: parsed.data, locale });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError && error.code === "validation") {
      return { ok: false, fieldErrors: toFieldErrors(error.fields), values: fields };
    }
    return { ok: false, error: errorKey(error), values: fields };
  }
}

/**
 * Contact form on /contact (PAGES.md). Used with useActionState.
 * @param {unknown} _previous
 * @param {FormData} formData
 */
export async function sendContactMessage(_previous, formData) {
  const locale = formData.get("locale") === "en" ? "en" : "bn";
  return submitForm(
    contactSchema,
    "/contact/",
    { name: text(formData, "name"), contact: text(formData, "contact"), subject: text(formData, "subject"), message: text(formData, "message") },
    locale,
  );
}

/**
 * Volunteer form on /get-involved?tab=volunteer (PAGES.md). Used with useActionState.
 * @param {unknown} _previous
 * @param {FormData} formData
 */
export async function registerVolunteer(_previous, formData) {
  const locale = formData.get("locale") === "en" ? "en" : "bn";
  return submitForm(
    volunteerSchema,
    "/volunteers/",
    {
      name: text(formData, "name"),
      phone: text(formData, "phone"),
      email: text(formData, "email"),
      district: text(formData, "district"),
      skills: text(formData, "skills"),
      availability: text(formData, "availability"),
    },
    locale,
  );
}
