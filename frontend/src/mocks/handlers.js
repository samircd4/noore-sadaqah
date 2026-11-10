/**
 * Mock implementation of docs/API.md, used when API_MODE is "mock" or "static".
 * Each route returns exactly what Django will return: same status codes, JSON shape and error codes.
 * Only src/lib/api.js calls `handle()`. Rules: frontend/CLAUDE.md "Mock API".
 *
 * Routes live in ./routes/, one file per endpoint group (docs/API.md), and register themselves on import.
 */

import "./routes/content";
import "./routes/donations";
import "./routes/forms";
import "./routes/org";

export { handle, matchPath, route } from "./router";
export { errors, localize, paginate, throttle } from "./helpers";
