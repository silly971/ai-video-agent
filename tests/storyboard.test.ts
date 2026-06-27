import { describe, expect, it } from "vitest";
import { createProjectFromDraft } from "../src/shared/schema";
import { createLocalStoryboard, parseStoryboardJson } from "../src/core/storyboard";

describe("storyboard parsing", () => {
  const project = createProjectFromDraft({
    name: "测试短片",
    idea: "一名设计师用 AI 修复旧录像",
    audience: "科技内容观众",
    style: "温暖纪实",
    ratio: "9:16",
    duration: 24,
    targetShots: 4,
  });

  it("parses model JSON into editable shots", () => {
    const result = parseStoryboardJson(
      JSON.stringify({
        characters: [{ name: "林夏", role: "主角", visualPrompt: "短发，蓝色外套" }],
        shots: [
          {
            title: "发现旧录像",
            scene: "工作室",
            characters: ["林夏"],
            narration: "她打开抽屉。",
            videoPrompt: "工作室暖光，人物打开抽屉，镜头缓慢推进",
            camera: "推近",
            duration: 6,
          },
        ],
      }),
      project,
    );

    expect(result.characters[0].name).toBe("林夏");
    expect(result.shots[0].videoPrompt).toContain("工作室");
    expect(result.shots[0].ratio).toBe("9:16");
  });

  it("creates a local fallback when JSON has no shots", () => {
    const result = createLocalStoryboard(project);
    expect(result.shots).toHaveLength(4);
    expect(result.characters[0].name).toBeTruthy();
  });
});
