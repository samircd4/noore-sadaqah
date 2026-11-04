/**
 * Where API calls go: mock fixtures, read-only fixtures, or Django.
 * Pure functions (no Next.js imports) so they can be unit-tested.
 * Spec: docs/ARCHITECTURE.md "API modes".
 */

export const API_MODES = /** @type {const} */ (["mock", "static", "live"]);

/**
 * Endpoint groups, by the first path segment (docs/API.md). During the backend phases a group can be
 * switched to Django on its own with API_LIVE_GROUPS=content,forms while everything else stays mocked.
 */
export const ENDPOINT_GROUPS = {
  content: [
    "site", "funds", "programs", "campaigns", "posts", "post-categories",
    "gallery", "people", "reports", "jobs", "transparency",
  ],
  forms: ["contact", "volunteers", "subscribers"],
  donations: ["donations"],
  auth: ["auth"],
  account: ["me"],
};

/**
 * @typedef {object} ApiConfig
 * @property {"mock" | "static" | "live"} mode
 * @property {Set<string>} liveGroups groups served by Django while mode is "mock"
 * @property {string | null} baseUrl Django base URL (server only)
 */

/**
 * Reads and validates the API settings from the environment.
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {ApiConfig}
 */
export function readApiConfig(env = process.env) {
  const mode = (env.API_MODE || "mock").trim();
  if (!API_MODES.includes(/** @type {any} */ (mode))) {
    throw new Error(`API_MODE must be one of ${API_MODES.join(", ")}; got "${mode}".`);
  }

  if (mode === "mock" && env.NODE_ENV === "production" && env.ALLOW_MOCK_IN_PRODUCTION !== "1") {
    throw new Error(
      "API_MODE=mock is not allowed in a production build. Use API_MODE=static or live, " +
        "or set ALLOW_MOCK_IN_PRODUCTION=1 for a staging demo or CI.",
    );
  }

  const liveGroups = new Set(
    (env.API_LIVE_GROUPS || "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean),
  );
  for (const group of liveGroups) {
    if (!(group in ENDPOINT_GROUPS)) {
      throw new Error(`Unknown group "${group}" in API_LIVE_GROUPS. Known: ${Object.keys(ENDPOINT_GROUPS).join(", ")}.`);
    }
  }

  const baseUrl = env.API_INTERNAL_URL ? env.API_INTERNAL_URL.replace(/\/+$/, "") : null;
  const needsDjango = mode === "live" || (mode === "mock" && liveGroups.size > 0);
  if (needsDjango && !baseUrl) {
    throw new Error("API_INTERNAL_URL is required when any endpoint is served by Django.");
  }

  return { mode: /** @type {ApiConfig["mode"]} */ (mode), liveGroups, baseUrl };
}

/**
 * The endpoint group a path belongs to ("/funds/zakat/" → "content"), or null if unknown.
 * @param {string} path
 */
export function groupOf(path) {
  const first = path.replace(/^\/+/, "").split(/[/?]/)[0];
  for (const [group, prefixes] of Object.entries(ENDPOINT_GROUPS)) {
    if (prefixes.includes(first)) return group;
  }
  return null;
}

/**
 * Decides who answers a call.
 * - live: always Django
 * - static: reads from the fixtures; every write is blocked (pre-launch site)
 * - mock: the fixtures, except groups listed in API_LIVE_GROUPS
 * @param {ApiConfig} config
 * @param {string} method
 * @param {string} path
 * @returns {"mock" | "live" | "blocked"}
 */
export function resolveTarget(config, method, path) {
  if (config.mode === "live") return "live";
  if (config.mode === "static") return method.toUpperCase() === "GET" ? "mock" : "blocked";
  const group = groupOf(path);
  return group && config.liveGroups.has(group) ? "live" : "mock";
}
