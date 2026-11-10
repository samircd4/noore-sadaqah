/**
 * The donation in progress, kept in sessionStorage between the form, /donate/checkout and /donate/failed
 * (DONATION_FLOW.md, PAGES.md): never in the URL, so names and phone numbers stay out of logs and history.
 * Client code only. Storage can be blocked (private mode, in-app browsers): every call fails quietly and the
 * pages handle a missing draft.
 */

export const DONATION_DRAFT_KEY = "noore:donation-draft";

/** A draft older than this is ignored (someone else may be using the phone later). */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * @typedef {object} DonationDraft
 * @property {string} fund
 * @property {string} [campaign]
 * @property {number} amount
 * @property {"one_time" | "monthly"} kind
 * @property {string} donor_name
 * @property {string} donor_phone
 * @property {string} [donor_email]
 * @property {string} [on_behalf_of]
 * @property {boolean} [on_behalf_permission]
 * @property {boolean} [is_anonymous]
 * @property {"bkash" | "sslcommerz"} [method]  missing after the home quick-donate; checkout asks for it
 * @property {"quick_donate" | "donate_form"} source
 * @property {"bn" | "en"} locale
 * @property {number} saved_at
 */

/** @param {Omit<DonationDraft, "saved_at">} draft */
export function saveDraft(draft) {
  try {
    sessionStorage.setItem(DONATION_DRAFT_KEY, JSON.stringify({ ...draft, saved_at: Date.now() }));
  } catch {
    // Storage blocked: checkout shows "start again".
  }
}

/** The stored draft as text ("" when none or storage is blocked): a stable value for useSyncExternalStore. */
export function readDraftText() {
  try {
    return sessionStorage.getItem(DONATION_DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

/** @returns {DonationDraft | null} */
export function loadDraft() {
  return parseDraft(readDraftText());
}

/**
 * @param {string} raw from readDraftText()
 * @returns {DonationDraft | null}
 */
export function parseDraft(raw) {
  try {
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== "object" || typeof draft.fund !== "string") return null;
    if (typeof draft.saved_at !== "number" || Date.now() - draft.saved_at > MAX_AGE_MS) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DONATION_DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}
