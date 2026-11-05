/**
 * Phone numbers: normalising a Bangladeshi mobile, and links for the foundation's numbers from GET /site/ (contact
 * page, footer, mobile menu). People type numbers in Bengali or Latin digits, with spaces, dashes or the +880 prefix.
 * No Zod here: the mobile menu (on every page) imports this file, so it must stay small.
 */

import { toLatinDigits } from "@/lib/format";

/**
 * Normalises a Bangladeshi mobile number to 01XXXXXXXXX, or returns null if it isn't one.
 * Accepts Bengali digits, spaces, dashes and the +880 / 880 prefix.
 * @param {unknown} input
 */
export function normalizeBdMobile(input) {
  const s = toLatinDigits(String(input ?? "")).replace(/[\s\-().]/g, "");
  const match = s.match(/^(?:\+?88)?(01[3-9]\d{8})$/);
  return match ? match[1] : null;
}

/**
 * The number for a tel: link (digits and a leading "+"), or null while it is still a placeholder
 * ("+880 1XXX-XXXXXX") or too short to dial.
 * @param {unknown} number
 */
export function telDigits(number) {
  const latin = toLatinDigits(String(number ?? ""));
  const digits = latin.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 11 ? digits : null;
}

/**
 * Digits for a wa.me link, which needs the country code: a BD mobile in any form becomes 8801XXXXXXXXX; another
 * number must already start with "+". Otherwise null (no link).
 * @param {unknown} number
 */
export function whatsappDigits(number) {
  const mobile = normalizeBdMobile(number);
  if (mobile) return `88${mobile}`;
  const digits = telDigits(number);
  return digits?.startsWith("+") ? digits.replace(/\D/g, "") : null;
}
