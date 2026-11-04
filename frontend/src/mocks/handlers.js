/**
 * Mock implementation of docs/API.md, used when API_MODE is "mock" or "static".
 * Each route returns exactly what Django will return: same status codes, JSON shape and error codes.
 * Only src/lib/api.js calls `handle()`. Rules: frontend/CLAUDE.md "Mock API".
 *
 * F0: the router and helpers only. Routes are added phase by phase (F1: /site/, /funds/ …).
 */

import { store } from "./store";

/**
 * @typedef {object} MockRequest
 * @property {string} method
 * @property {string} path         e.g. "/funds/zakat/"
 * @property {Record<string, string>} [query]
 * @property {unknown} [body]
 * @property {"bn" | "en"} locale  from Accept-Language
 * @property {string | null} [token] access token, if logged in
 * @property {string | null} [ip]   visitor IP (X-Forwarded-For)
 *
 * @typedef {{ status: number, body: unknown }} MockResponse
 *
 * @typedef {(ctx: MockRequest & { params: Record<string, string>, store: typeof store }) => MockResponse | Promise<MockResponse>} MockHandler
 */

/** @type {Array<{ method: string, template: string, handler: MockHandler }>} */
const routes = [
  // Added in F1+, for example:
  // route("GET", "/funds/:slug/", ({ params, locale }) => ...),
];

/**
 * Registers a route. `template` uses ":name" for path parameters, with the trailing slash API.md uses.
 * @param {string} method
 * @param {string} template
 * @param {MockHandler} handler
 */
export function route(method, template, handler) {
  routes.push({ method: method.toUpperCase(), template, handler });
}

/**
 * Matches "/funds/:slug/" against "/funds/zakat/" → { slug: "zakat" }, or null.
 * @param {string} template
 * @param {string} path
 */
export function matchPath(template, path) {
  const t = template.split("/").filter(Boolean);
  const p = path.split("?")[0].split("/").filter(Boolean);
  if (t.length !== p.length) return null;
  /** @type {Record<string, string>} */
  const params = {};
  for (let i = 0; i < t.length; i++) {
    if (t[i].startsWith(":")) params[t[i].slice(1)] = decodeURIComponent(p[i]);
    else if (t[i] !== p[i]) return null;
  }
  return params;
}

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

/** Standard error bodies (docs/API.md "Errors"). */
export const errors = {
  notFound: () => ({ status: 404, body: { error: { code: "notFound" } } }),
  validation: (fields) => ({ status: 400, body: { error: { code: "validation", fields } } }),
  throttled: (retryAfter) => ({ status: 429, body: { error: { code: "throttled", retry_after: retryAfter } } }),
  conflict: () => ({ status: 409, body: { error: { code: "conflict" } } }),
  authRequired: () => ({ status: 401, body: { error: { code: "authRequired" } } }),
};

/**
 * Answers one request.
 * @param {MockRequest} request
 * @returns {Promise<MockResponse>}
 */
export async function handle(request) {
  const method = request.method.toUpperCase();
  for (const r of routes) {
    if (r.method !== method) continue;
    const params = matchPath(r.template, request.path);
    if (params) return r.handler({ ...request, method, params, store });
  }
  return errors.notFound();
}
