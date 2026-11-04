/**
 * Form endpoints (docs/API.md "Forms"). F1: newsletter. F2 adds contact and volunteers.
 * Throttle: 5 per 10 minutes per IP (scope "forms").
 */

import { subscriberSchema } from "@/lib/validation/forms";
import { errors, ok, throttle, zodToFields } from "../helpers";
import { route } from "../router";

const FORMS_LIMIT = 5;
const FORMS_WINDOW_MS = 10 * 60 * 1000;

route("POST", "/subscribers/", ({ body, ip, store }) => {
  const wait = throttle(store.throttles, `forms:${ip ?? "unknown"}`, FORMS_LIMIT, FORMS_WINDOW_MS);
  if (wait !== null) return errors.throttled(wait);

  const parsed = subscriberSchema.safeParse(body ?? {});
  if (!parsed.success) return errors.validation(zodToFields(parsed.error));

  // An email that is already subscribed also gets 201, so nobody can test who is on the list (API.md).
  if (!store.submissions.some((s) => s.type === "subscriber" && s.email === parsed.data.email)) {
    store.submissions.push({ type: "subscriber", email: parsed.data.email, created_at: new Date().toISOString() });
  }
  return ok({}, 201);
});
