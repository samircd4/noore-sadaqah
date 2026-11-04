import { describe, expect, it } from "vitest";
import { handle } from "../handlers";
import { resetStore } from "../store";

const get = (path, query = {}, locale = "bn") => handle({ method: "GET", path, query, locale });

/** True if any key anywhere starts with "_" (fixture-only notes must never reach the API response). */
function hasPrivateKeys(value) {
  if (Array.isArray(value)) return value.some(hasPrivateKeys);
  if (value && typeof value === "object") return Object.entries(value).some(([k, v]) => k.startsWith("_") || hasPrivateKeys(v));
  return false;
}

/** True if a `{bn, en}` object is left unresolved. */
function hasUnresolvedText(value) {
  if (Array.isArray(value)) return value.some(hasUnresolvedText);
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length > 0 && keys.every((k) => k === "bn" || k === "en")) return true;
    return Object.values(value).some(hasUnresolvedText);
  }
  return false;
}

describe("content endpoints (docs/API.md shapes)", () => {
  it("GET /site/ resolves language and hides fixture notes", async () => {
    const bn = await get("/site/");
    const en = await get("/site/", {}, "en");
    expect(bn.status).toBe(200);
    expect(hasPrivateKeys(bn.body)).toBe(false);
    expect(hasUnresolvedText(bn.body)).toBe(false);
    expect(bn.body.quote.text).toContain("সাদাকাহ");
    expect(en.body.stats[0].label).toBe("Families supported");
    expect(bn.body.home_images.hero).toEqual(expect.objectContaining({ url: expect.any(String), alt: expect.any(String) }));
  });

  it("GET /funds/ lists funds without body; detail adds sanitized body_html", async () => {
    const list = await get("/funds/");
    expect(list.body.map((f) => f.slug)).toEqual(["sadaqah", "zakat", "fitra", "orphan"]);
    expect(list.body[0]).not.toHaveProperty("body_html");
    expect(list.body[0]).not.toHaveProperty("sort_order");
    const detail = await get("/funds/zakat/");
    expect(detail.body.body_html).toMatch(/^<p>/);
    expect((await get("/funds/nope/")).status).toBe(404);
  });

  it("GET /programs/?featured=1 returns cards with a fund reference", async () => {
    const res = await get("/programs/", { featured: "1" });
    expect(res.body).toHaveLength(6);
    expect(res.body[1]).toEqual(
      expect.objectContaining({ slug: "education", badge: "শিক্ষা", fund: { slug: "orphan", title: "এতিম সহায়তা" } }),
    );
  });

  it("GET /programs/ (no filter) returns a plain array in sort_order, list fields only", async () => {
    const res = await get("/programs/");
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.map((p) => p.slug)).toEqual(["food", "education", "water", "health", "trees", "mosque"]);
    expect(Object.keys(res.body[0]).sort()).toEqual(["badge", "cover", "fund", "slug", "summary", "title"]);
  });

  it("GET /programs/{slug}/ returns the API.md detail shape in both languages", async () => {
    const bn = await get("/programs/education/");
    expect(bn.status).toBe(200);
    expect(hasPrivateKeys(bn.body)).toBe(false);
    expect(hasUnresolvedText(bn.body)).toBe(false);
    expect(Object.keys(bn.body).sort()).toEqual(
      [
        "area", "badge", "beneficiary", "body_html", "cover", "duration", "faq", "fund", "goals", "images",
        "impact", "related", "slug", "summary", "title",
      ].sort(),
    );
    expect(bn.body.body_html).toMatch(/^<p>/);
    expect(bn.body.goals.every((g) => typeof g === "string")).toBe(true);
    expect(bn.body.faq[0]).toEqual({ q: expect.any(String), a: expect.any(String) });
    expect(bn.body.impact[0]).toEqual({ year: expect.any(Number), metric: expect.any(String), value: expect.any(Number) });
    expect(bn.body.images[0]).toEqual(expect.objectContaining({ url: expect.any(String), alt: expect.any(String) }));
    expect(bn.body.fund).toEqual({ slug: "orphan", title: "এতিম সহায়তা", preset_amounts: [500, 1000, 2000] });

    const en = await get("/programs/education/", {}, "en");
    expect(en.body.title).toBe("Orphan care and education");
    expect(en.body.fund.title).toBe("Orphan support");
  });

  it("GET /programs/{slug}/ lists 3 related programs, never itself", async () => {
    const { body } = await get("/programs/food/");
    expect(body.related).toHaveLength(3);
    expect(body.related.map((p) => p.slug)).not.toContain("food");
    expect(body.related[0]).not.toHaveProperty("body_html");
  });

  it("GET /programs/{slug}/ is 404 notFound for an unknown slug", async () => {
    expect(await get("/programs/nope/")).toEqual({ status: 404, body: { error: { code: "notFound" } } });
  });

  it("GET /campaigns/{slug}/ returns the detail shape; unknown slug is 404", async () => {
    resetStore();
    const { status, body } = await get("/campaigns/orphan-smile/");
    expect(status).toBe(200);
    expect(hasPrivateKeys(body)).toBe(false);
    expect(hasUnresolvedText(body)).toBe(false);
    expect(Object.keys(body).sort()).toEqual(
      [
        "body_html", "cover", "donor_count", "ends_at", "fund", "goal_amount", "highlighted_option", "is_ended",
        "monthly_options", "percent", "raised_amount", "recent_donors", "slug", "starts_at", "summary", "title",
      ].sort(),
    );
    expect(body).toEqual(expect.objectContaining({ ends_at: null, is_ended: false, fund: { slug: "orphan", title: "এতিম সহায়তা" } }));
    expect(body.body_html).toMatch(/^<p>/);
    expect((await get("/campaigns/orphan-smile/", {}, "en")).body.title).toBe("Bring a smile to an orphan's face");
    expect(await get("/campaigns/nope/")).toEqual({ status: 404, body: { error: { code: "notFound" } } });
  });

  it("GET /campaigns/{slug}/ marks a campaign past ends_at as ended", async () => {
    const { body } = await get("/campaigns/winter-blanket-2025/");
    expect(body.is_ended).toBe(true);
    expect(body.raised_amount).toBe(186500);
    expect(body.percent).toBe(93);
    // Ended campaigns are not featured, so the home banner never shows one.
    const featured = (await get("/campaigns/", { featured: "1" })).body.map((c) => c.slug);
    expect(featured).not.toContain("winter-blanket-2025");
    expect((await get("/campaigns/")).body.map((c) => c.slug)).toContain("winter-blanket-2025");
  });

  it("GET /campaigns/{slug}/ recent_donors: first name only, null when anonymous, never phone or email", async () => {
    resetStore();
    const { store } = await import("../store");
    const base = { campaign: "orphan-smile", status: "paid", amount: 500, donor_phone: "01711000000", donor_email: "x@example.com" };
    store.donations.set("d1", { ...base, id: "d1", donor_name: "রহিম উদ্দিন", is_anonymous: false, paid_at: "2026-11-01T05:00:00Z" });
    store.donations.set("d2", { ...base, id: "d2", donor_name: "করিম", is_anonymous: true, paid_at: "2026-11-02T05:00:00Z" });
    const { body } = await get("/campaigns/orphan-smile/");
    expect(body.recent_donors).toEqual([
      { name: null, amount: 500, paid_at: "2026-11-02T05:00:00Z" },
      { name: "রহিম", amount: 500, paid_at: "2026-11-01T05:00:00Z" },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/01711000000|example\.com/);
    resetStore();
  });

  it("GET /campaigns/ computes raised, percent and donors, never personal data", async () => {
    resetStore();
    const [campaign] = (await get("/campaigns/", { featured: "1" })).body;
    expect(campaign).toEqual(
      expect.objectContaining({ raised_amount: 320000, goal_amount: 500000, percent: 64, donor_count: 211, is_ended: false }),
    );
    expect(campaign).not.toHaveProperty("offline_raised");
    expect(campaign.recent_donors).toEqual([]);
  });

  it("GET /gallery/ and /posts/ paginate", async () => {
    const gallery = await get("/gallery/", { limit: "6" });
    expect(gallery.body).toEqual(expect.objectContaining({ count: 6, page: 1, pages: 1 }));
    expect(gallery.body.results[0].category).toEqual({ slug: "relief", name: "ত্রাণ" });

    const posts = await get("/posts/", { limit: "3" });
    expect(posts.body.results.map((p) => p.published_at)).toEqual([...posts.body.results.map((p) => p.published_at)].sort().reverse());
    expect((await get("/posts/", { page: "9" })).status).toBe(404);
    expect((await get("/posts/school-supplies-500-students/")).body.related).toHaveLength(2);
  });
});

describe("POST /subscribers/", () => {
  const post = (body, ip = "203.0.113.1") => handle({ method: "POST", path: "/subscribers/", body, locale: "bn", ip });

  it("validates, accepts duplicates silently, and throttles per IP", async () => {
    resetStore();
    expect(await post({ email: "bad" })).toEqual({ status: 400, body: { error: { code: "validation", fields: { email: ["emailInvalid"] } } } });
    expect((await post({ email: "a@example.com" })).status).toBe(201);
    expect((await post({ email: "A@example.com" })).status).toBe(201);
    expect((await post({ email: "b@example.com" })).status).toBe(201);
    expect((await post({ email: "c@example.com" })).status).toBe(201);
    const sixth = await post({ email: "d@example.com" });
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe("throttled");
    expect((await post({ email: "d@example.com" }, "203.0.113.2")).status).toBe(201);
  });
});
