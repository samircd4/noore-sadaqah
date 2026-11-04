/**
 * Clean list parameters from the URL (`?page=`, `?category=`) before they reach the API. Anything unexpected falls
 * back to the default, so a typo shows page 1 / all posts instead of an error, and random input can't create
 * endless cache entries (apiGet caches per query).
 */

const MAX_PAGE = 999;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * `searchParams` values can be a string, an array (repeated key) or undefined; use the first string.
 * @param {string | string[] | undefined} value
 */
function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * "2" → 2. Missing, zero, negative, non-integer or huge values → 1.
 * @param {string | string[] | undefined} value
 */
export function parsePage(value) {
  const s = first(value);
  if (!s || !/^\d{1,3}$/.test(s)) return 1;
  const n = Number(s);
  return n >= 1 && n <= MAX_PAGE ? n : 1;
}

/**
 * A slug like "relief" (CLAUDE.md conventions: lower-case, hyphenated), else "".
 * @param {string | string[] | undefined} value
 */
export function parseSlug(value) {
  const s = first(value);
  return s && s.length <= 60 && SLUG.test(s) ? s : "";
}
