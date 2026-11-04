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
