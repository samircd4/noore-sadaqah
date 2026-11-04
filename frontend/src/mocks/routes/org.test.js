import { describe, expect, it } from "vitest";
import { DISTRICTS, districtOptions } from "@/lib/districts";
import { handle } from "../handlers";
import { resetStore, store } from "../store";

const get = (path, query = {}, locale = "bn") => handle({ method: "GET", path, query, locale });
const post = (path, body, ip = "198.51.100.7") => handle({ method: "POST", path, body, locale: "bn", ip });

function hasPrivateKeys(value) {
  if (Array.isArray(value)) return value.some(hasPrivateKeys);
  if (value && typeof value === "object") return Object.entries(value).some(([k, v]) => k.startsWith("_") || hasPrivateKeys(v));
  return false;
}

describe("organisation endpoints (docs/API.md shapes)", () => {
  it("GET /people/ is a plain array in sort_order; photos only with consent", async () => {
    const { body } = await get("/people/");
    expect(Array.isArray(body)).toBe(true);
    expect(Object.keys(body[0]).sort()).toEqual(["bio", "name", "photo", "role"]);
    expect(body[0].role).toBe("চেয়ারম্যান");
    expect(body.every((p) => p.photo === null)).toBe(true);
    expect(hasPrivateKeys(body)).toBe(false);
    expect((await get("/people/", {}, "en")).body[0].role).toBe("Chairman");
  });

  it("GET /reports/ is newest first and filters by kind and year", async () => {
    const all = (await get("/reports/")).body;
    expect(Object.keys(all[0]).sort()).toEqual(["file_url", "id", "kind", "published_at", "title", "year"]);
    expect(all.map((r) => r.published_at)).toEqual([...all.map((r) => r.published_at)].sort().reverse());
    expect((await get("/reports/", { kind: "registration" })).body.map((r) => r.kind)).toEqual(["registration"]);
    expect((await get("/reports/", { year: "2024" })).body.every((r) => r.year === 2024)).toBe(true);
  });

  it("GET /jobs/ hides closed and expired positions", async () => {
    const slugs = (await get("/jobs/")).body.map((j) => j.slug);
    expect(slugs).toEqual(["field-officer-relief", "accounts-assistant"]);
    const [job] = (await get("/jobs/")).body;
    expect(Object.keys(job).sort()).toEqual(["apply_email", "apply_url", "body_html", "closes_at", "location", "slug", "title"]);
    expect(job.body_html).toMatch(/^<p>/);
  });

  it("GET /transparency/totals/ sums by year and fund, zakat listed after the others", async () => {
    resetStore();
    store.donations.set("t1", { id: "t1", fund: "sadaqah", amount: 5000, status: "paid", paid_at: "2026-06-01T05:00:00Z" });
    store.donations.set("t2", { id: "t2", fund: "sadaqah", amount: 9999, status: "pending", paid_at: null });
    const { body } = await get("/transparency/totals/");
    expect(body.years.map((y) => y.year)).toEqual([2026, 2025]);
    const y2026 = body.years[0];
    expect(y2026.funds.find((f) => f.slug === "sadaqah").total).toBe(1425000);
    const zakatIndex = y2026.funds.findIndex((f) => f.is_zakat);
    expect(y2026.funds.slice(zakatIndex).every((f) => f.is_zakat)).toBe(true);
    expect(y2026.total).toBe(y2026.funds.reduce((s, f) => s + f.total, 0));
    resetStore();
  });

  it("GET /pages/{slug}/ renders markdown; unknown slug is 404", async () => {
    const { status, body } = await get("/pages/privacy/");
    expect(status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(["body_html", "slug", "title", "updated_at"]);
    expect(body.title).toBe("গোপনীয়তা নীতি");
    expect(body.body_html).toContain("<h2>");
    expect(body.body_html).not.toContain("<script");
    for (const slug of ["terms", "refund-policy", "about", "how-we-spend"]) expect((await get(`/pages/${slug}/`)).status).toBe(200);
    expect((await get("/pages/nope/")).status).toBe(404);
  });

  it("GET /site/ includes about and contact_faq", async () => {
    const { body } = await get("/site/");
    expect(body.about).toEqual({ mission: expect.any(String), vision: expect.any(String) });
    expect(body.contact_faq[0]).toEqual({ q: expect.any(String), a: expect.any(String) });
    expect(body.registration).not.toHaveProperty("_note");
  });
});

describe("POST /contact/ and /volunteers/", () => {
  it("contact accepts a mobile or an email and rejects anything else", async () => {
    resetStore();
    const base = { name: "রহিম", subject: "প্রশ্ন", message: "সালাম" };
    expect((await post("/contact/", { ...base, contact: "০১৭১১-০০০০০০" })).status).toBe(201);
    expect((await post("/contact/", { ...base, contact: "A@Example.com" })).status).toBe(201);
    expect(store.submissions.filter((s) => s.type === "contact").map((s) => s.contact)).toEqual(["01711000000", "a@example.com"]);
    expect(await post("/contact/", { ...base, contact: "hello" })).toEqual({
      status: 400,
      body: { error: { code: "validation", fields: { contact: ["contactInvalid"] } } },
    });
    expect((await post("/contact/", {})).body.error.fields).toEqual({
      name: ["required"], contact: ["required"], subject: ["required"], message: ["required"],
    });
    expect((await post("/contact/", { ...base, contact: "a@b.co", message: "x".repeat(2001) })).body.error.fields).toEqual({ message: ["tooLong"] });
  });

  it("volunteers validates phone, district and availability", async () => {
    resetStore();
    const ok = { name: "করিম", phone: "01811000000", district: "kurigram", availability: "weekends" };
    expect((await post("/volunteers/", ok)).status).toBe(201);
    const bad = await post("/volunteers/", { name: "করিম", phone: "123", district: "atlantis", availability: "never", email: "bad" });
    expect(bad.body.error.fields).toEqual({
      phone: ["mobileInvalid"], email: ["emailInvalid"], district: ["districtInvalid"], availability: ["choiceInvalid"],
    });
  });

  it("shares the 5 per 10 minutes forms throttle", async () => {
    resetStore();
    const msg = { name: "ক", contact: "01711000000", subject: "খ", message: "গ" };
    for (let i = 0; i < 5; i++) expect((await post("/contact/", msg, "198.51.100.9")).status).toBe(201);
    expect((await post("/volunteers/", { name: "ক", phone: "01711000000", district: "dhaka" }, "198.51.100.9")).status).toBe(429);
  });
});

describe("districts", () => {
  it("has the 64 districts with unique slugs and both names", () => {
    expect(DISTRICTS).toHaveLength(64);
    expect(new Set(DISTRICTS.map((d) => d.slug)).size).toBe(64);
    expect(DISTRICTS.every((d) => d.bn && d.en && /^[a-z]+(-[a-z]+)*$/.test(d.slug))).toBe(true);
    expect(districtOptions("en")[0]).toEqual({ value: "bagerhat", label: "Bagerhat" });
  });
});
