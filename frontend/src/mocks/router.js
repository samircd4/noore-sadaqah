/**
 * Route registry for the mock API. Route files in ./routes/ call `route()`; `handle()` answers a request.
 * Kept separate from handlers.js so route files can import it without a circular import.
 */

import { errors } from "./helpers";
import { store } from "./store";

/**
 * @typedef {object} MockRequest
 * @property {string} method
 * @property {string} path         e.g. "/funds/zakat/"
 * @property {Record<string, string>} [query]
 * @property {any} [body]
 * @property {"bn" | "en"} locale  from Accept-Language
 * @property {string | null} [token] access token, if logged in
 * @property {string | null} [ip]   visitor IP (X-Forwarded-For)
 *
 * @typedef {{ status: number, body: unknown }} MockResponse
 *
 * @typedef {(ctx: MockRequest & { params: Record<string, string>, query: Record<string, string>, store: typeof store }) => MockResponse | Promise<MockResponse>} MockHandler
 */

/** @type {Array<{ method: string, template: string, handler: MockHandler }>} */
const routes = [];

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
 * Answers one request.
 * @param {MockRequest} request
 * @returns {Promise<MockResponse>}
 */
export async function handle(request) {
  const method = request.method.toUpperCase();
  const query = request.query ?? {};
  for (const r of routes) {
    if (r.method !== method) continue;
    const params = matchPath(r.template, request.path);
    if (params) return r.handler({ ...request, method, query, params, store });
  }
  return errors.notFound();
}
