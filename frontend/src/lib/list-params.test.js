import { describe, expect, it } from "vitest";
import { parsePage, parseSlug } from "./list-params";

describe("parsePage", () => {
  it("accepts whole numbers from 1 to 999", () => {
    expect(parsePage("2")).toBe(2);
    expect(parsePage("999")).toBe(999);
    expect(parsePage(["3", "4"])).toBe(3);
  });

  it("falls back to 1 for anything else", () => {
    for (const bad of [undefined, "", "0", "-1", "1.5", "abc", "1000", "2e3", " 2"]) {
      expect(parsePage(bad)).toBe(1);
    }
  });
});

describe("parseSlug", () => {
  it("accepts lower-case hyphenated slugs", () => {
    expect(parseSlug("relief")).toBe("relief");
    expect(parseSlug("flood-relief-2026")).toBe("flood-relief-2026");
  });

  it("returns empty for anything else", () => {
    for (const bad of [undefined, "", "Relief", "a b", "-x", "x-", "a--b", "<script>", "x".repeat(61)]) {
      expect(parseSlug(bad)).toBe("");
    }
  });
});
