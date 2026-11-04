"use server";

/**
 * Server actions for the small public forms (frontend/CLAUDE.md rule 4):
 * validate with Zod, call the API, map errors to message keys.
 * Result: { ok: true } or { ok: false, fieldErrors?, error? } (keys like "errors.emailInvalid").
 */

import { apiRequest } from "@/lib/api";
import { ApiError, errorKey, fromZodError, toFieldErrors } from "@/lib/api-errors";
import { subscriberSchema } from "@/lib/validation/forms";

/**
 * Newsletter sign-up in the footer. Used with useActionState.
 * @param {unknown} _previous
 * @param {FormData} formData
 */
export async function subscribe(_previous, formData) {
  const locale = formData.get("locale") === "en" ? "en" : "bn";
  const parsed = subscriberSchema.safeParse({ email: formData.get("email") ?? "" });
  if (!parsed.success) return { ok: false, fieldErrors: fromZodError(parsed.error) };

  try {
    await apiRequest("/subscribers/", { method: "POST", body: parsed.data, locale });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError && error.code === "validation") {
      return { ok: false, fieldErrors: toFieldErrors(error.fields) };
    }
    return { ok: false, error: errorKey(error) };
  }
}
