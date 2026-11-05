/**
 * Links for the foundation's phone numbers from GET /site/ (contact page, footer, mobile menu). The admin may type
 * a number in Bengali or Latin digits, with spaces, dashes or the +880 prefix.
 */

import { toLatinDigits } from "@/lib/format";
import { normalizeBdMobile } from "@/lib/validation/common";

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
