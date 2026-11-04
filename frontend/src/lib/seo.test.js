import { describe, expect, it } from "vitest";
import { localizedPath, pageMetadata, shortDescription } from "./seo";

describe("localizedPath", () => {
  it("leaves Bengali unprefixed and puts English under /en", () => {
    expect(localizedPath("/programs/water", "bn")).toBe("/programs/water");
    expect(localizedPath("/programs/water", "en")).toBe("/en/programs/water");
    expect(localizedPath("/", "en")).toBe("/en");
  });
});

describe("shortDescription", () => {
  it("keeps short text as is and collapses whitespace", () => {
    expect(shortDescription("  এক  দুই\nতিন ")).toBe("এক দুই তিন");
    expect(shortDescription(undefined)).toBe("");
  });

  it("cuts long text to at most 155 characters at a word boundary", () => {
    const long = "শব্দ ".repeat(60);
    const out = shortDescription(long);
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith("শব্দ…")).toBe(true);
  });
});

describe("pageMetadata", () => {
  it("builds canonical, language alternates and Open Graph", () => {
    const meta = pageMetadata({
      path: "/programs/water",
      locale: "en",
      title: "Clean water project",
      description: "Tube wells.",
      image: { url: "https://example.com/a.jpg", width: 900, height: 1200, alt: "A well" },
    });
    expect(meta.alternates).toEqual({
      canonical: "/en/programs/water",
      languages: { bn: "/programs/water", en: "/en/programs/water", "x-default": "/programs/water" },
    });
    expect(meta.openGraph.images[0].url).toBe("https://example.com/a.jpg");
    expect(meta.twitter.card).toBe("summary_large_image");
  });

  it("falls back to a summary card without an image", () => {
    const meta = pageMetadata({ path: "/programs", locale: "bn", title: "কার্যক্রম" });
    expect(meta.openGraph.images).toBeUndefined();
    expect(meta.twitter.card).toBe("summary");
  });
});
