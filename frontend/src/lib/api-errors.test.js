import { describe, expect, it } from "vitest";
import { ApiError, errorKey, toFieldErrors } from "./api-errors";

describe("ApiError", () => {
  it("keeps the API.md error fields", () => {
    const e = new ApiError(429, { code: "throttled", retry_after: 42 });
    expect(e.status).toBe(429);
    expect(e.code).toBe("throttled");
    expect(e.retryAfter).toBe(42);
    expect(e.fields).toEqual({});
  });

  it("falls back to unknown", () => {
    expect(new ApiError(500).code).toBe("unknown");
  });
});

describe("toFieldErrors", () => {
  it("maps codes and params to message keys, first error per field", () => {
    expect(
      toFieldErrors({
        donor_phone: ["mobileInvalid", "required"],
        amount: [{ code: "minAmount", min: 10 }],
      }),
    ).toEqual({
      donor_phone: { key: "errors.mobileInvalid", params: {} },
      amount: { key: "errors.minAmount", params: { min: 10 } },
    });
  });

  it("ignores empty lists", () => {
    expect(toFieldErrors({ name: [] })).toEqual({});
  });
});

describe("errorKey", () => {
  it("returns the key for an ApiError and a fallback otherwise", () => {
    expect(errorKey(new ApiError(503, { code: "comingSoon" }))).toBe("errors.comingSoon");
    expect(errorKey(new Error("boom"))).toBe("errors.unknown");
  });
});
