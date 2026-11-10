/**
 * In-memory state for the mock API: what Django would keep in the database.
 * It lives on globalThis so it survives hot reloads in `next dev`, and it is lost when the server restarts.
 * Only the mock routes (and the mock-only /donate/mock-gateway page, through src/mocks/gateway.js) use it.
 */

const KEY = Symbol.for("noore-sadaqah.mock-store");

function createStore() {
  return {
    /** @type {Map<string, object>} id → donation */
    donations: new Map(),
    /** @type {Map<number, number>} Dhaka year → last receipt sequence (ReceiptCounter) */
    receiptCounters: new Map(),
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

// A store kept from before a hot reload may lack collections added since: add them without losing data.
export const store = Object.assign(createStore(), (globalThis[KEY] ??= createStore()));
globalThis[KEY] = store;

/** Empties every collection (used by tests). */
export function resetStore() {
  for (const value of Object.values(store)) {
    if (value instanceof Map) value.clear();
    else if (Array.isArray(value)) value.length = 0;
  }
}
