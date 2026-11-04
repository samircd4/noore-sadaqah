import { describe, expect, it } from "vitest";
import { pageItems } from "./pagination";

describe("pageItems", () => {
  it("lists every page when there are 7 or fewer", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(2, 3)).toEqual([1, 2, 3]);
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("puts gaps on both sides in the middle", () => {
    expect(pageItems(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10]);
  });

  it("shows the first pages without a gap near the start", () => {
    expect(pageItems(1, 10)).toEqual([1, 2, 3, 4, "gap", 10]);
    expect(pageItems(3, 10)).toEqual([1, 2, 3, 4, "gap", 10]);
  });

  it("shows the last pages without a gap near the end", () => {
    expect(pageItems(10, 10)).toEqual([1, "gap", 7, 8, 9, 10]);
    expect(pageItems(8, 10)).toEqual([1, "gap", 7, 8, 9, 10]);
  });

  it("fills a one-page gap with the number instead of an ellipsis", () => {
    expect(pageItems(4, 10)).toEqual([1, 2, 3, 4, 5, "gap", 10]);
  });
});
