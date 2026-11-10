import "server-only";

import { apiRequest, ApiError } from "@/lib/api";

/** Donation ids are UUIDs; anything else is treated as unknown without calling the API. */
const ID_PATTERN = /^[0-9a-f-]{8,64}$/i;

/**
 * GET /donations/{id}/status/ for the success and failed pages: uncached, no personal data in the answer.
 * Returns null when the id is missing, malformed or unknown (404); other errors are thrown.
 * @param {string | string[] | undefined} id from searchParams
 * @param {"bn" | "en"} locale
 */
export async function donationStatus(id, locale) {
  const value = Array.isArray(id) ? id[0] : id;
  if (!value || !ID_PATTERN.test(value)) return null;
  try {
    return await apiRequest(`/donations/${encodeURIComponent(value)}/status/`, { locale });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
