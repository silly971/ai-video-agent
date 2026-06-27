import { describe, expect, it } from "vitest";
import { createDefaultSettings, normalizeVideoTask } from "../src/shared/schema";
import { joinUrl, parseHeadersJson } from "../src/core/http";

describe("video provider helpers", () => {
  it("normalizes common async task statuses", () => {
    expect(normalizeVideoTask({ id: "1", status: "processing", progress: 40 }).status).toBe("running");
    expect(normalizeVideoTask({ id: "1", status: "completed", progress: 100 }).status).toBe("succeeded");
    expect(normalizeVideoTask({ id: "1", status: "failed", error: "quota" }).status).toBe("failed");
  });

  it("joins custom base urls and endpoints", () => {
    expect(joinUrl("https://example.com/", "/v1/videos")).toBe("https://example.com/v1/videos");
  });

  it("accepts custom JSON headers", () => {
    const settings = createDefaultSettings();
    settings.newApi.headersJson = "{\"X-Route\":\"seedance\"}";
    expect(parseHeadersJson(settings.newApi.headersJson)).toEqual({ "X-Route": "seedance" });
  });
});
