import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { handle } from "@/mocks/handlers";
import { ApiError } from "./api-errors";
import { readApiConfig, resolveTarget } from "./api-mode";

/**
 * The only door to the backend (docs/ARCHITECTURE.md "How the apps talk" and "API modes").
 * Server code only: server components, server actions, route handlers.
 *
 *  - apiGet()     public content, cached with "use cache" + cacheTag (tags per endpoint in docs/API.md)
 *  - apiRequest() everything else: writes, donation status, donor data; never cached
 *
 * Both return the parsed JSON body, or throw ApiError with the API.md error shape.
 */

export { ApiError } from "./api-errors";

const TIMEOUT_MS = 10_000;

/** @param {string | undefined} locale */
function normalizeLocale(locale) {
  return locale === "en" ? "en" : "bn";
}

/** @param {Record<string, string | number | boolean | null | undefined> | null | undefined} query */
function queryString(query) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * Sends one request to the mock or to Django.
 * @param {{ method: string, path: string, query?: object | null, body?: unknown, locale: "bn" | "en", token?: string | null, ip?: string | null }} req
 */
async function send({ method, path, query = null, body, locale, token = null, ip = null }) {
  const config = readApiConfig();
  const target = resolveTarget(config, method, path);

  if (target === "blocked") {
    throw new ApiError(503, { code: "comingSoon" });
  }

  let status;
  let data;

  if (target === "mock") {
    const flatQuery = Object.fromEntries(new URLSearchParams(queryString(query)));
    ({ status, body: data } = await handle({ method, path, query: flatQuery, body, locale, token, ip }));
  } else {
    /** @type {Record<string, string>} */
    const requestHeaders = { Accept: "application/json", "Accept-Language": locale };
    if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
    if (ip) requestHeaders["X-Forwarded-For"] = ip;

    let response;
    try {
      response = await fetch(`${config.baseUrl}${path}${queryString(query)}`, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new ApiError(503, { code: "apiUnavailable" });
    }
    status = response.status;
    data = status === 204 ? null : await response.json().catch(() => null);
  }

  if (status >= 400) {
    throw new ApiError(status, /** @type {any} */ (data)?.error ?? { code: "unknown" });
  }
  return data;
}

/**
 * Cached read of public content. Cached functions can't read headers or cookies, so the locale is an argument.
 * @param {string} path         e.g. "/programs/water/"
 * @param {{ locale?: string, query?: object, tags?: string[], life?: string }} [options]
 *   tags: cache tags from docs/API.md (Django's revalidate hook calls revalidateTag on them)
 *   life: a cacheLife profile, default "minutes"
 */
export async function apiGet(path, { locale, query, tags = [], life = "minutes" } = {}) {
  const result = await cachedGet(path, normalizeLocale(locale), query ?? null, tags, life);
  if (result.error) throw new ApiError(result.error.status, result.error.body);
  return result.data;
}

/**
 * apiGet() for detail pages: an API 404 (unknown slug, draft post) becomes Next's notFound(), so the page shows
 * not-found.js (frontend/CLAUDE.md rule 14). Every other error is thrown as usual. The status is a real 404 only
 * when this runs before the page starts streaming; inside a <Suspense> hole (e.g. ?page= past the end on /news)
 * it stays 200 and Next adds a noindex meta tag.
 * @param {string} path
 * @param {Parameters<typeof apiGet>[1]} [options]
 */
export async function apiGetOrNotFound(path, options) {
  try {
    return await apiGet(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

/**
 * The cached part of apiGet(). It never throws an ApiError: one thrown inside "use cache" comes back out as a
 * rebuilt object (instanceof ApiError fails), and with Next 16.4.5 an unknown /programs/{slug} then never finished
 * responding. Errors are returned as plain data instead and turned back into an ApiError by apiGet().
 * A 404 is cached like content (the endpoint's tag clears it when the item is published); any other error only
 * for seconds, so a short API outage doesn't stick.
 */
async function cachedGet(path, locale, query, tags, life) {
  "use cache";
  if (tags.length > 0) cacheTag(...tags);
  try {
    const data = await send({ method: "GET", path, query, locale });
    cacheLife(life);
    return { data };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    cacheLife(error.status === 404 ? life : "seconds");
    return {
      error: {
        status: error.status,
        body: { code: error.code, fields: error.fields, retry_after: error.retryAfter ?? undefined },
      },
    };
  }
}

/**
 * Uncached call: writes, donation status, anything with a token or that must be fresh.
 * Forwards the visitor's IP (X-Forwarded-For from Nginx) so Django throttles the right person.
 * @param {string} path
 * @param {{ method?: string, body?: unknown, query?: object, locale?: string, token?: string | null }} [options]
 */
export async function apiRequest(path, { method = "GET", body, query, locale, token = null } = {}) {
  let ip = null;
  try {
    ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || null;
  } catch {
    // Called outside a request (e.g. at build time): no IP to forward.
  }
  return send({ method: method.toUpperCase(), path, query, body, locale: normalizeLocale(locale), token, ip });
}
