"use server";

/**
 * Donation server actions (DONATION_FLOW.md "One-time donation", frontend/CLAUDE.md rule 4).
 *  - createDonation(): checkout's "পেমেন্ট করুন" → POST /donations/ → redirect to the gateway's redirect_url
 *  - refreshDonation(): the success page's poller while a donation is PENDING → POST /donations/{id}/refresh/
 * A donation becomes PAID only in Django after server-side gateway validation; nothing here can mark it paid.
 */

import { redirect } from "next/navigation";
import { apiGet, apiRequest } from "@/lib/api";
import { ApiError, errorKey, fromZodError, toFieldErrors } from "@/lib/api-errors";
import { donationSchema } from "@/lib/validation/donation";

/** Donation ids are UUIDs; anything else never reaches the API path. */
const ID_PATTERN = /^[0-9a-f-]{8,64}$/i;

/** @param {unknown} value */
const localeOf = (value) => (value === "en" ? "en" : "bn");

/**
 * Where to send the browser after create. Django returns the gateway's https URL. The mock returns the unprefixed
 * path "/donate/mock-gateway?id=…" (API.md "Mock"), which gets the donor's language prefix so /en stays English.
 * Anything else is refused rather than followed.
 * @param {unknown} url
 * @param {"bn" | "en"} locale
 */
function gatewayTarget(url, locale) {
  if (typeof url !== "string") return null;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("/") && !url.startsWith("//")) return /^\/(bn|en)(\/|$)/.test(url) ? url : `/${locale}${url}`;
  return null;
}

/**
 * Creates the donation and redirects to the payment page. Returns only on failure:
 * `{ ok: false, fieldErrors?, error? }` with message keys ("errors.gatewayUnavailable" …).
 * @param {Record<string, unknown>} input the checkout draft plus the chosen method
 */
export async function createDonation(input) {
  const locale = localeOf(input?.locale);
  let target = null;
  try {
    const funds = await apiGet("/funds/", { locale, tags: ["funds"] });
    const parsed = donationSchema(funds).safeParse({ ...input, locale });
    if (!parsed.success) return { ok: false, fieldErrors: fromZodError(parsed.error) };

    // F4 adds the donor's Bearer token here when they are logged in (API.md: then `user` is set).
    const created = await apiRequest("/donations/", { method: "POST", body: parsed.data, locale });
    target = gatewayTarget(/** @type {any} */ (created)?.redirect_url, locale);
    if (!target) return { ok: false, error: "errors.unknown" };
  } catch (error) {
    if (error instanceof ApiError && error.code === "validation") {
      return { ok: false, fieldErrors: toFieldErrors(error.fields) };
    }
    return { ok: false, error: errorKey(error) };
  }
  // Outside the try: redirect() works by throwing.
  redirect(target);
}

/**
 * Asks Django to re-check a PENDING donation (at most every 5 s, 12 times: the poller enforces it).
 * Returns the public status body, or `{ error }` with a message key.
 * @param {string} id
 * @param {"bn" | "en"} locale
 */
export async function refreshDonation(id, locale) {
  if (typeof id !== "string" || !ID_PATTERN.test(id)) return { error: "errors.notFound" };
  try {
    return await apiRequest(`/donations/${encodeURIComponent(id)}/refresh/`, { method: "POST", locale: localeOf(locale) });
  } catch (error) {
    return { error: errorKey(error) };
  }
}
