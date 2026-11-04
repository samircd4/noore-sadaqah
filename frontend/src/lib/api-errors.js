/**
 * The error shape every API call uses (docs/API.md "Errors"), and its mapping to message keys.
 * Pure module: safe to import from server code, client code and tests.
 */

export class ApiError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {{ code?: string, fields?: Record<string, Array<string | {code: string}>>, retry_after?: number }} [error]
   */
  constructor(status, error = {}) {
    super(`API error ${status}: ${error.code ?? "unknown"}`);
    this.name = "ApiError";
    this.status = status;
    this.code = error.code ?? "unknown";
    this.fields = error.fields ?? {};
    this.retryAfter = error.retry_after ?? null;
  }
}

/**
 * Turns DRF-style field errors into message keys for the form, using the first error per field.
 * `{ donor_phone: ["mobileInvalid"], amount: [{code: "minAmount", min: 10}] }` →
 * `{ donor_phone: { key: "errors.mobileInvalid", params: {} }, amount: { key: "errors.minAmount", params: { min: 10 } } }`
 * @param {Record<string, Array<string | {code: string}>>} fields
 */
export function toFieldErrors(fields = {}) {
  /** @type {Record<string, { key: string, params: Record<string, unknown> }>} */
  const result = {};
  for (const [field, errors] of Object.entries(fields)) {
    const first = Array.isArray(errors) ? errors[0] : errors;
    if (!first) continue;
    if (typeof first === "string") {
      result[field] = { key: `errors.${first}`, params: {} };
    } else {
      const { code, ...params } = first;
      result[field] = { key: `errors.${code}`, params };
    }
  }
  return result;
}

/**
 * Same result shape as toFieldErrors(), from a Zod error (client-side or server-action validation).
 * Schemas use message keys as messages ("errors.minAmount") and put values in the issue's `params`.
 * @param {{ issues: Array<{ path: PropertyKey[], message: string, params?: Record<string, unknown> }> }} zodError
 */
export function fromZodError(zodError) {
  /** @type {Record<string, { key: string, params: Record<string, unknown> }>} */
  const result = {};
  for (const issue of zodError.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!result[field]) result[field] = { key: issue.message, params: issue.params ?? {} };
  }
  return result;
}

/**
 * The message key for a whole-request error (`throttled`, `comingSoon`, `apiUnavailable` …).
 * @param {unknown} error
 */
export function errorKey(error) {
  return error instanceof ApiError ? `errors.${error.code}` : "errors.unknown";
}
