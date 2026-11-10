import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { settleMockDonation } from "../gateway";
import { handle } from "../handlers";
import { resetStore } from "../store";

const post = (path, body, { locale = "bn", ip = "203.0.113.5" } = {}) => handle({ method: "POST", path, body, locale, ip });
const get = (path, locale = "bn") => handle({ method: "GET", path, locale });

const valid = {
  fund: "orphan",
  campaign: "",
  amount: "১০০০",
  kind: "one_time",
  donor_name: "রহিম উদ্দিন",
  donor_phone: "+8801712345678",
  donor_email: "",
  on_behalf_of: "",
  on_behalf_permission: false,
  is_anonymous: false,
  method: "bkash",
  locale: "bn",
};

beforeEach(() => resetStore());
afterEach(() => {
  delete process.env.MOCK_GATEWAY_DOWN;
});

describe("POST /donations/", () => {
  it("creates a PENDING donation and points to the mock gateway", async () => {
    const res = await post("/donations/", valid);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), redirect_url: `/donate/mock-gateway?id=${res.body.id}`, expires_at: expect.any(String) });

    const status = await get(`/donations/${res.body.id}/status/`);
    expect(status.body).toEqual({
      id: res.body.id,
      status: "pending",
      amount: 1000,
      fund: { slug: "orphan", title: "এতিম সহায়তা" },
      kind: "one_time",
      receipt_no: null,
      paid_at: null,
      fail_reason: null,
    });
    // No personal data in the public status.
    expect(JSON.stringify(status.body)).not.toContain("01712345678");
  });

  it("returns DRF-style field errors", async () => {
    const res = await post("/donations/", { ...valid, amount: "5", donor_phone: "0171234567", method: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
    expect(res.body.error.fields).toEqual({
      amount: [{ code: "minAmount", min: 10 }],
      donor_phone: ["mobileInvalid"],
      method: ["required"],
    });
    expect((await post("/donations/", { ...valid, method: "paypal" })).body.error.fields).toEqual({ method: ["choiceInvalid"] });
    const low = await post("/donations/", { ...valid, amount: "5" });
    expect(low.body.error.fields).toEqual({ amount: [{ code: "minAmount", min: 10 }] });
  });

  it("needs permission to give on someone's behalf", async () => {
    const res = await post("/donations/", { ...valid, on_behalf_of: "মা" });
    expect(res.body.error.fields).toEqual({ on_behalf_permission: ["onBehalfPermission"] });
  });

  it("refuses fitra until it opens, monthly where not allowed, and ended campaigns", async () => {
    expect((await post("/donations/", { ...valid, fund: "fitra" })).body.error.fields).toEqual({ fund: ["fitraClosed"] });
    expect((await post("/donations/", { ...valid, fund: "fitra", kind: "monthly" })).body.error.fields.kind).toEqual(["recurringNotAllowed"]);
    expect((await post("/donations/", { ...valid, campaign: "winter-blanket-2025" })).body.error.fields).toEqual({ campaign: ["choiceInvalid"] });
    expect((await post("/donations/", { ...valid, campaign: "orphan-smile" })).status).toBe(201);
  });

  it("throttles the 11th create from one IP in 10 minutes", async () => {
    for (let i = 0; i < 10; i++) expect((await post("/donations/", valid)).status).toBe(201);
    const res = await post("/donations/", valid);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("throttled");
    expect((await post("/donations/", valid, { ip: "203.0.113.6" })).status).toBe(201);
  });

  it("answers 502 gatewayUnavailable when the mock gateway is down", async () => {
    process.env.MOCK_GATEWAY_DOWN = "1";
    const res = await post("/donations/", valid);
    expect(res).toEqual({ status: 502, body: { error: { code: "gatewayUnavailable" } } });
  });
});

describe("mock gateway outcomes", () => {
  it("success marks PAID once, with a receipt number and link", async () => {
    const { body } = await post("/donations/", valid);
    expect(settleMockDonation(body.id, "success")).toBe(`/bn/donate/success?id=${body.id}`);
    const first = (await get(`/donations/${body.id}/status/`)).body;
    expect(first.status).toBe("paid");
    expect(first.receipt_no).toMatch(/^NSF-\d{4}-000001$/);
    expect(first.receipt_url).toMatch(/^\/r\/NSD[A-Z2-7]{10}-[a-z2-7]{10}$/);

    // A repeated callback changes nothing: one receipt number.
    settleMockDonation(body.id, "success");
    settleMockDonation(body.id, "fail");
    expect((await get(`/donations/${body.id}/status/`)).body).toEqual(first);

    const second = await post("/donations/", valid);
    settleMockDonation(second.body.id, "success");
    expect((await get(`/donations/${second.body.id}/status/`)).body.receipt_no).toMatch(/-000002$/);
  });

  it("fail and cancel go to the failed page; pending stays pending", async () => {
    const a = (await post("/donations/", { ...valid, locale: "en" })).body.id;
    expect(settleMockDonation(a, "fail")).toBe(`/en/donate/failed?id=${a}`);
    const failed = (await get(`/donations/${a}/status/`, "en")).body;
    expect(failed).toMatchObject({ status: "failed", receipt_no: null, fail_reason: expect.any(String) });
    expect(failed).not.toHaveProperty("receipt_url");

    const b = (await post("/donations/", valid)).body.id;
    expect(settleMockDonation(b, "cancel")).toBe(`/bn/donate/failed?id=${b}`);
    expect((await get(`/donations/${b}/status/`)).body.status).toBe("cancelled");

    const c = (await post("/donations/", valid)).body.id;
    expect(settleMockDonation(c, "pending")).toBe(`/bn/donate/success?id=${c}`);
    expect((await post(`/donations/${c}/refresh/`)).body.status).toBe("pending");
  });

  it("a late success turns FAILED into PAID; CANCELLED never changes", async () => {
    const a = (await post("/donations/", valid)).body.id;
    settleMockDonation(a, "fail");
    expect(settleMockDonation(a, "success")).toBe(`/bn/donate/success?id=${a}`);
    expect((await get(`/donations/${a}/status/`)).body).toMatchObject({ status: "paid", fail_reason: null, receipt_no: expect.any(String) });
    // Other outcomes don't move a FAILED donation.
    const b = (await post("/donations/", valid)).body.id;
    settleMockDonation(b, "fail");
    settleMockDonation(b, "cancel");
    expect((await get(`/donations/${b}/status/`)).body.status).toBe("failed");

    const c = (await post("/donations/", valid)).body.id;
    settleMockDonation(c, "cancel");
    expect(settleMockDonation(c, "success")).toBe(`/bn/donate/failed?id=${c}`);
    expect((await get(`/donations/${c}/status/`)).body.status).toBe("cancelled");
  });

  it("monthly creates a subscription that becomes active after the first payment", async () => {
    const { body } = await post("/donations/", { ...valid, kind: "monthly" });
    expect((await get(`/donations/${body.id}/status/`)).body.kind).toBe("monthly");
    settleMockDonation(body.id, "success");
    const { store } = await import("../store");
    const [subscription] = [...store.subscriptions.values()];
    expect(subscription).toMatchObject({ status: "active", mode: "reminder", amount: 1000 });
    expect(subscription.next_charge_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("unknown ids are 404", async () => {
    expect((await get("/donations/nope/status/")).status).toBe(404);
    expect((await post("/donations/nope/refresh/")).status).toBe(404);
    expect(settleMockDonation("nope", "success")).toBeNull();
  });
});
