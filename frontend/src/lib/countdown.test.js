import { describe, expect, it } from "vitest";
import { daysLeft } from "./countdown";

const now = Date.parse("2026-11-04T06:00:00Z");

describe("daysLeft", () => {
  it("rounds part of a day up", () => {
    expect(daysLeft("2026-11-04T18:00:00Z", now)).toBe(1);
    expect(daysLeft("2026-11-06T06:00:00Z", now)).toBe(2);
    expect(daysLeft("2026-11-06T06:00:01Z", now)).toBe(3);
  });

  it("is 0 at or after the end, and for a bad date", () => {
    expect(daysLeft("2026-11-04T06:00:00Z", now)).toBe(0);
    expect(daysLeft("2026-02-28T17:59:59Z", now)).toBe(0);
    expect(daysLeft("not a date", now)).toBe(0);
  });
});
