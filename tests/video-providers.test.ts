import { describe, expect, it } from "vitest";
import { createDefaultSettings, migrateAgentState, normalizeVideoTask } from "../src/shared/schema";
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
    settings.newApi.video.headersJson = "{\"X-Route\":\"seedance\"}";
    expect(parseHeadersJson(settings.newApi.video.headersJson)).toEqual({ "X-Route": "seedance" });
  });

  it("migrates legacy Seedance provider settings into New API video config", () => {
    const state = migrateAgentState({
      schemaVersion: 1,
      settings: {
        saveRawResponses: false,
        newApi: {
          baseUrl: "https://newapi.example.com",
          apiKey: "analysis-key",
          chatModel: "analysis-model",
          imageModel: "image-model",
          videoModel: "legacy-video-model",
          headersJson: "{\"X-Analysis\":\"1\"}",
          timeoutSeconds: 42,
        },
        seedance: {
          enabled: true,
          baseUrl: "https://seedance.example.com",
          apiKey: "video-key",
          model: "seedance-video-model",
          headersJson: "{\"X-Video\":\"1\"}",
          timeoutSeconds: 99,
          resolution: "1080p",
          ratio: "16:9",
          duration: 8,
          generateAudio: false,
          watermark: true,
        },
      },
      projects: [],
      jobs: [
        {
          id: "job-1",
          projectId: "project-1",
          shotId: "shot-1",
          shotTitle: "镜头 1",
          provider: "seedance",
          status: "queued",
          progress: 0,
          createdAt: "2026-06-27T00:00:00.000Z",
          updatedAt: "2026-06-27T00:00:00.000Z",
        },
      ],
      logs: [],
      activeProjectId: null,
    });

    expect(state.schemaVersion).toBe(2);
    expect(state.settings.newApi.analysis.baseUrl).toBe("https://newapi.example.com");
    expect(state.settings.newApi.analysis.model).toBe("analysis-model");
    expect(state.settings.newApi.image.model).toBe("image-model");
    expect(state.settings.newApi.video.baseUrl).toBe("https://seedance.example.com");
    expect(state.settings.newApi.video.model).toBe("seedance-video-model");
    expect(state.settings.newApi.video.resolution).toBe("1080p");
    expect(state.jobs[0].provider).toBe("newapi-video");
  });
});
