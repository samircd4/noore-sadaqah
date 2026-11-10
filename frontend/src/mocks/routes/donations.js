/**
 * Donation endpoints (docs/API.md "Donations"): create, status, refresh. Donations live in the in-memory store.
 * The mock has no gateway: `redirect_url` points to the mock-only page /donate/mock-gateway, which settles the
 * donation through ../gateway.js the way Django's callbacks would (only server-side, never from the URL).
 *
 * Mock-only switch: MOCK_GATEWAY_DOWN=1 makes create answer 502 gatewayUnavailable (the donation stays PENDING,
 * as in Django when the gateway times out), so the checkout's error message can be tested.
 */

import { randomBytes, randomUUID } from "node:crypto";
import { donationSchema } from "@/lib/validation/donation";
import campaignsFixture from "../fixtures/campaigns.json";
import fundsFixture from "../fixtures/funds.json";
import siteFixture from "../fixtures/site.json";
import { errors, localize, ok, throttle, zodToFields } from "../helpers";
import { receiptUrl } from "../gateway";
import { route } from "../router";

const CREATE_LIMIT = 10;
const CREATE_WINDOW_MS = 10 * 60 * 1000;
const SESSION_MS = 30 * 60 * 1000;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Our reference sent to the gateway (`tran_id` / `merchantInvoiceNumber`), e.g. "NSD7K2M9QX4PA". */
function newGatewayRef() {
  return `NSD${[...randomBytes(10)].map((b) => BASE32[b % 32]).join("")}`;
}

/** A 400 with one field error. @param {string} field @param {string} code */
const fieldError = (field, code) => errors.validation({ [field]: [code] });

/**
 * The public status body (API.md "GET /donations/{id}/status/"): no personal data.
 * @param {any} d stored donation
 * @param {"bn" | "en"} locale
 */
export function statusBody(d, locale) {
  const fund = fundsFixture.find((f) => f.slug === d.fund);
  const body = {
    id: d.id,
    status: d.status,
    amount: d.amount,
    fund: { slug: d.fund, title: fund ? localize(fund.title, locale) : d.fund },
    kind: d.kind,
    receipt_no: d.receipt_no,
    paid_at: d.paid_at,
    fail_reason: d.fail_reason ? localize(d.fail_reason, locale) : null,
  };
  if (d.status === "paid") body.receipt_url = receiptUrl(d.gateway_ref);
  return body;
}

route("POST", "/donations/", ({ body, ip, store, locale }) => {
  const wait = throttle(store.throttles, `donation_create:${ip ?? "unknown"}`, CREATE_LIMIT, CREATE_WINDOW_MS);
  if (wait !== null) return errors.throttled(wait);

  const parsed = donationSchema(fundsFixture).safeParse(body ?? {});
  if (!parsed.success) return errors.validation(zodToFields(parsed.error));
  const data = parsed.data;
  const fund = /** @type {any} */ (fundsFixture.find((f) => f.slug === data.fund));

  // The fitra form waits for ZAKAT_POLICY.md sign-off; until fitra opens the API refuses it (DONATION_FLOW.md "Fitra").
  if (fund.is_fitra && !siteFixture.fitra.open) return fieldError("fund", "fitraClosed");

  if (data.campaign) {
    const campaign = campaignsFixture.find((c) => c.slug === data.campaign);
    if (!campaign || campaign.fund !== data.fund) return fieldError("campaign", "choiceInvalid");
    if (campaign.ends_at && new Date(campaign.ends_at).getTime() < Date.now()) return fieldError("campaign", "campaignEnded");
  }

  const now = new Date();
  const donation = {
    id: randomUUID(),
    gateway_ref: newGatewayRef(),
    status: "pending",
    ...data,
    locale: data.locale ?? locale,
    subscription: null,
    created_at: now.toISOString(),
    paid_at: null,
    receipt_no: null,
    fail_reason: null,
  };

  if (data.kind === "monthly") {
    const subscription = {
      id: randomUUID(),
      fund: data.fund,
      amount: data.amount,
      method: data.method,
      // REMINDER until a gateway confirms AUTO for the method (DONATION_FLOW.md "Gateway reality check").
      mode: "reminder",
      status: "pending",
      anchor_day: Number(new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "Asia/Dhaka" }).format(now)),
      next_charge_on: null,
      fail_count: 0,
      created_at: now.toISOString(),
    };
    store.subscriptions.set(subscription.id, subscription);
    donation.subscription = subscription.id;
  }

  store.donations.set(donation.id, donation);

  if (process.env.MOCK_GATEWAY_DOWN === "1") {
    return { status: 502, body: { error: { code: "gatewayUnavailable" } } };
  }

  return ok(
    {
      id: donation.id,
      redirect_url: `/donate/mock-gateway?id=${donation.id}`,
      expires_at: new Date(now.getTime() + SESSION_MS).toISOString(),
    },
    201,
  );
});

route("GET", "/donations/:id/status/", ({ params, store, locale }) => {
  const d = store.donations.get(params.id);
  return d ? ok(statusBody(d, locale)) : errors.notFound();
});

// Django asks the gateway once when a donation is still PENDING after 2 minutes. The mock has no gateway to ask,
// so a donation left "pending" on the mock gateway page stays pending (the success page's 12 polls run out).
route("POST", "/donations/:id/refresh/", ({ params, store, locale }) => {
  const d = store.donations.get(params.id);
  return d ? ok(statusBody(d, locale)) : errors.notFound();
});
