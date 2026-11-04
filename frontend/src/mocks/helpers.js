/**
 * Helpers shared by the mock routes: language resolution, the API.md error bodies, pagination, throttling.
 */

/**
 * Resolves `{ bn, en }` fixture values to one language, like Django does from Accept-Language.
 * English falls back to Bengali when missing or empty. Works on nested objects and arrays.
 * @param {unknown} value
 * @param {"bn" | "en"} locale
 * @returns {any}
 */
export function localize(value, locale) {
  if (Array.isArray(value)) return value.map((v) => localize(v, locale));
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length > 0 && keys.every((k) => k === "bn" || k === "en") && "bn" in value) {
      return (locale === "en" && value.en) || value.bn;
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localize(v, locale)]));
  }
  return value;
}

/** Response helpers with the exact bodies from docs/API.md "Errors". */
export const ok = (body, status = 200) => ({ status, body });

export const errors = {
  notFound: () => ({ status: 404, body: { error: { code: "notFound" } } }),
  validation: (fields) => ({ status: 400, body: { error: { code: "validation", fields } } }),
  throttled: (retryAfter) => ({ status: 429, body: { error: { code: "throttled", retry_after: retryAfter } } }),
  conflict: () => ({ status: 409, body: { error: { code: "conflict" } } }),
  authRequired: () => ({ status: 401, body: { error: { code: "authRequired" } } }),
};

export const PAGE_SIZE = 12;

/**
 * `{ count, page, pages, results }` as in docs/API.md "Pagination". Pages past the end return 404.
 * @template T
 * @param {T[]} items
 * @param {string | number | undefined} pageParam
 * @param {number} [size=PAGE_SIZE]
 */
export function paginate(items, pageParam, size = PAGE_SIZE) {
  const page = Math.max(1, Number.parseInt(String(pageParam ?? "1"), 10) || 1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  if (page > pages) return null;
  return { count: items.length, page, pages, results: items.slice((page - 1) * size, page * size) };
}

/**
 * Sliding-window throttle like DRF's. Returns null when allowed, or the seconds to wait.
 * @param {Map<string, number[]>} buckets store.throttles
 * @param {string} key e.g. "forms:203.0.113.9"
 * @param {number} limit requests allowed per window
 * @param {number} windowMs
 * @param {number} [now=Date.now()]
 */
export function throttle(buckets, key, limit, windowMs, now = Date.now()) {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return Math.ceil((windowMs - (now - recent[0])) / 1000);
  }
  recent.push(now);
  buckets.set(key, recent);
  return null;
}

/**
 * Turns a Zod error into DRF-style field errors: `{ field: ["mobileInvalid"] }` or `[{code: "minAmount", min: 10}]`.
 * Our schemas use message keys like "errors.minAmount"; params travel in the issue's `params`.
 * @param {import("zod").ZodError} zodError
 */
export function zodToFields(zodError) {
  /** @type {Record<string, Array<string | object>>} */
  const fields = {};
  for (const issue of zodError.issues) {
    const field = String(issue.path[0] ?? "non_field_errors");
    const code = String(issue.message).replace(/^errors\./, "");
    const params = /** @type {any} */ (issue).params;
    (fields[field] ??= []).push(params ? { code, ...params } : code);
  }
  return fields;
}
