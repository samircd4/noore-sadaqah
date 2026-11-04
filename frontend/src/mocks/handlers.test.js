import { describe, expect, it } from "vitest";
import { handle, localize, matchPath, route } from "./handlers";

describe("matchPath", () => {
  it("matches templates with parameters", () => {
    expect(matchPath("/funds/:slug/", "/funds/zakat/")).toEqual({ slug: "zakat" });
    expect(matchPath("/funds/", "/funds/")).toEqual({});
    expect(matchPath("/funds/", "/funds/?page=2")).toEqual({});
  });

  it("rejects different paths", () => {
    expect(matchPath("/funds/:slug/", "/funds/")).toBeNull();
    expect(matchPath("/funds/:slug/", "/programs/water/")).toBeNull();
  });
});

describe("localize", () => {
  it("picks the language and falls back to Bengali", () => {
    expect(localize({ bn: "সাদাকাহ", en: "Sadaqah" }, "en")).toBe("Sadaqah");
    expect(localize({ bn: "সাদাকাহ", en: "" }, "en")).toBe("সাদাকাহ");
    expect(localize({ bn: "সাদাকাহ" }, "en")).toBe("সাদাকাহ");
  });

  it("works on nested data and leaves other values alone", () => {
    const fixture = { slug: "zakat", title: { bn: "যাকাত", en: "Zakat" }, preset_amounts: [100, 200], faq: [{ q: { bn: "প্র", en: "Q" } }] };
    expect(localize(fixture, "en")).toEqual({ slug: "zakat", title: "Zakat", preset_amounts: [100, 200], faq: [{ q: "Q" }] });
  });
});

describe("handle", () => {
  it("returns notFound for unknown routes", async () => {
    expect(await handle({ method: "GET", path: "/nothing/", locale: "bn" })).toEqual({
      status: 404,
      body: { error: { code: "notFound" } },
    });
  });

  it("dispatches to a registered route with params", async () => {
    route("GET", "/test-only/:id/", ({ params, locale }) => ({ status: 200, body: { id: params.id, locale } }));
    expect(await handle({ method: "get", path: "/test-only/42/", locale: "en" })).toEqual({
      status: 200,
      body: { id: "42", locale: "en" },
    });
  });
});
