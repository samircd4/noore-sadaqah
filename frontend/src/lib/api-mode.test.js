import { describe, expect, it } from "vitest";
import { groupOf, readApiConfig, resolveTarget } from "./api-mode";

describe("readApiConfig", () => {
  it("defaults to mock", () => {
    expect(readApiConfig({}).mode).toBe("mock");
  });

  it("rejects unknown modes", () => {
    expect(() => readApiConfig({ API_MODE: "fake" })).toThrow(/API_MODE/);
  });

  it("refuses mock in a production build unless allowed", () => {
    expect(() => readApiConfig({ API_MODE: "mock", NODE_ENV: "production" })).toThrow(/not allowed/);
    expect(readApiConfig({ API_MODE: "mock", NODE_ENV: "production", ALLOW_MOCK_IN_PRODUCTION: "1" }).mode).toBe("mock");
  });

  it("allows static in production", () => {
    expect(readApiConfig({ API_MODE: "static", NODE_ENV: "production" }).mode).toBe("static");
  });

  it("requires API_INTERNAL_URL when Django serves anything", () => {
    expect(() => readApiConfig({ API_MODE: "live" })).toThrow(/API_INTERNAL_URL/);
    expect(() => readApiConfig({ API_MODE: "mock", API_LIVE_GROUPS: "content" })).toThrow(/API_INTERNAL_URL/);
  });

  it("strips the trailing slash from the base URL", () => {
    const config = readApiConfig({ API_MODE: "live", API_INTERNAL_URL: "http://127.0.0.1:8000/api/v1/" });
    expect(config.baseUrl).toBe("http://127.0.0.1:8000/api/v1");
  });

  it("parses and validates API_LIVE_GROUPS", () => {
    const config = readApiConfig({ API_LIVE_GROUPS: "content, forms", API_INTERNAL_URL: "http://x" });
    expect([...config.liveGroups]).toEqual(["content", "forms"]);
    expect(() => readApiConfig({ API_LIVE_GROUPS: "payments", API_INTERNAL_URL: "http://x" })).toThrow(/Unknown group/);
  });
});

describe("groupOf", () => {
  it("finds the group from the first path segment", () => {
    expect(groupOf("/funds/zakat/")).toBe("content");
    expect(groupOf("/post-categories/")).toBe("content");
    expect(groupOf("/contact/")).toBe("forms");
    expect(groupOf("/donations/abc/status/")).toBe("donations");
    expect(groupOf("/auth/otp/request/")).toBe("auth");
    expect(groupOf("/me/subscriptions/")).toBe("account");
    expect(groupOf("/funds/?page=2")).toBe("content");
  });

  it("returns null for unknown paths", () => {
    expect(groupOf("/payments/sslcommerz/ipn/")).toBeNull();
  });
});

describe("resolveTarget", () => {
  const mock = readApiConfig({ API_MODE: "mock" });
  const staticMode = readApiConfig({ API_MODE: "static" });
  const live = readApiConfig({ API_MODE: "live", API_INTERNAL_URL: "http://x" });
  const partly = readApiConfig({ API_MODE: "mock", API_LIVE_GROUPS: "content", API_INTERNAL_URL: "http://x" });

  it("live sends everything to Django", () => {
    expect(resolveTarget(live, "GET", "/funds/")).toBe("live");
    expect(resolveTarget(live, "POST", "/donations/")).toBe("live");
  });

  it("static reads fixtures and blocks writes", () => {
    expect(resolveTarget(staticMode, "GET", "/funds/")).toBe("mock");
    expect(resolveTarget(staticMode, "post", "/contact/")).toBe("blocked");
  });

  it("mock uses fixtures except live groups", () => {
    expect(resolveTarget(mock, "POST", "/donations/")).toBe("mock");
    expect(resolveTarget(partly, "GET", "/programs/")).toBe("live");
    expect(resolveTarget(partly, "POST", "/donations/")).toBe("mock");
  });
});
