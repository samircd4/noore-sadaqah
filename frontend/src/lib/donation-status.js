import "server-only";

import { apiRequest, ApiError } from "@/lib/api";
import { isDonationId } from "@/lib/validation/donation";

/**
 * GET /donations/{id}/status/ for the success and failed pages: uncached, no personal data in the answer.
 * Returns null when the id is missing, malformed or unknown (404); other errors are thrown.
 * @param {string | string[] | undefined} id from searchParams
 * @param {"bn" | "en"} locale
 */
export async function donationStatus(id, locale) {
  const value = Array.isArray(id) ? id[0] : id;
  // A malformed id is treated as unknown without calling the API.
  if (!isDonationId(value)) return null;
  try {
    return await apiRequest(`/donations/${encodeURIComponent(value)}/status/`, { locale });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
