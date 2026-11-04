/**
 * Display formatting for numbers, money and dates (docs/I18N.md).
 * Values are always stored as plain numbers; these functions only format for display.
 * Works in server and client components.
 */

/** @typedef {"bn" | "en"} Locale */

const NUMBER_LOCALE = { bn: "bn-BD", en: "en-US" };
const DATE_LOCALE = { bn: "bn-BD", en: "en-GB" };
const TIME_ZONE = "Asia/Dhaka";

const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

const numberFormatters = {
  bn: new Intl.NumberFormat(NUMBER_LOCALE.bn, { maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat(NUMBER_LOCALE.en, { maximumFractionDigits: 0 }),
};

/** @param {string | undefined} locale @returns {Locale} */
function pick(locale) {
  return locale === "en" ? "en" : "bn";
}

/**
 * Whole number with grouping: bn → "১২,৫০০" (lakh grouping: "১,০০,০০০"), en → "12,500".
 * @param {number} value
 * @param {string} [locale="bn"]
 */
export function bnNumber(value, locale = "bn") {
  return numberFormatters[pick(locale)].format(value);
}

/**
 * Digits only, no grouping, for years and identifiers: bn → "২০২৬", en → "2026".
 * @param {number | string} value
 * @param {string} [locale="bn"]
 */
export function bnDigits(value, locale = "bn") {
  const s = String(value);
  return pick(locale) === "en" ? s : s.replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]);
}

/**
 * Amount in taka with the sign in front: bn → "৳১,০০০", en → "৳1,000".
 * @param {number} amount integer taka
 * @param {string} [locale="bn"]
 */
export function taka(amount, locale = "bn") {
  return `৳${bnNumber(amount, locale)}`;
}

/**
 * Date in Asia/Dhaka: bn → "২০ অক্টোবর ২০২৬", en → "20 October 2026".
 * Built from parts so the output has no comma in either language.
 * @param {Date | string | number} date
 * @param {string} [locale="bn"]
 */
export function bnDate(date, locale = "bn") {
  const loc = pick(locale);
  const parts = new Intl.DateTimeFormat(DATE_LOCALE[loc], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).formatToParts(new Date(date));
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

/**
 * Short form for big stats, without the "+" (that comes from the data's `suffix`).
 * bn: lakh/crore words ("১ লক্ষ", "১.৫ লক্ষ", "১.২ কোটি"); below 1 lakh the full number.
 * en: compact notation ("100K", "1.5M"); below 10,000 the full number.
 * @param {number} value
 * @param {string} [locale="bn"]
 */
export function shortNumber(value, locale = "bn") {
  const loc = pick(locale);
  if (loc === "en") {
    if (Math.abs(value) < 10_000) return bnNumber(value, "en");
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  const scaled = (n, unit) => {
    const short = new Intl.NumberFormat(NUMBER_LOCALE.bn, { maximumFractionDigits: 1 }).format(n);
    return `${short} ${unit}`;
  };
  if (Math.abs(value) >= 10_000_000) return scaled(value / 10_000_000, "কোটি");
  if (Math.abs(value) >= 100_000) return scaled(value / 100_000, "লক্ষ");
  return bnNumber(value, "bn");
}

/**
 * Turns Bengali digits into ASCII digits so validation can parse them: "১০০০" → "1000".
 * Other characters are left as they are.
 * @param {string} input
 */
export function toLatinDigits(input) {
  if (input == null) return "";
  return String(input).replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
}
