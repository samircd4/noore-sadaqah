/**
 * In-memory state for the mock API: what Django would keep in the database.
 * It lives on globalThis so it survives hot reloads in `next dev`, and it is lost when the server restarts.
 * Only src/mocks/handlers.js uses it.
 */

const KEY = Symbol.for("noore-sadaqah.mock-store");

function createStore() {
  return {
    /** @type {Map<string, object>} id → donation */
    donations: new Map(),
    /** @type {Map<string, object>} id → subscription */
    subscriptions: new Map(),
    /** @type {Map<string, object>} phone or email → donor */
    users: new Map(),
    /** @type {Map<string, object>} target → { code, expiresAt, attempts } */
    otpCodes: new Map(),
    /** @type {Map<string, object>} refresh token → { userId, expiresAt } */
    refreshTokens: new Map(),
    /** @type {Array<object>} contact messages, volunteers and subscribers, for inspection while testing */
    submissions: [],
    /** @type {Map<string, number[]>} throttle key → request timestamps */
    throttles: new Map(),
  };
}

export const store = (globalThis[KEY] ??= createStore());

/** Empties every collection (used by tests). */
export function resetStore() {
  for (const value of Object.values(store)) {
    if (value instanceof Map) value.clear();
    else if (Array.isArray(value)) value.length = 0;
  }
}
