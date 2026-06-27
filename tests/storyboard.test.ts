import { describe, expect, it } from "vitest";
import { createProjectFromDraft } from "../src/shared/schema";
import { WORKFLOW_DEFINITIONS, type WorkflowId } from "../src/shared/workflows";
import { buildStoryboardPrompt, createLocalStoryboard, parseStoryboardJson } from "../src/core/storyboard";

describe("storyboard parsing", () => {
  function makeProject(workflowId: WorkflowId = "shortify-linear") {
    return createProjectFromDraft({
      name: "测试短片",
      workflowId,
      idea: "一名设计师用 AI 修复旧录像",
      audience: "科技内容观众",
      style: "温暖纪实",
      ratio: "9:16",
      duration: 24,
      targetShots: 4,
    });
  }

  const project = makeProject();

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
            voicePrompt: "轻声旁白",
            productionNotes: "script_to_storyboard 已完成",
            taskTags: ["script_to_storyboard"],
            camera: "推近",
            duration: 6,
          },
        ],
      }),
      project,
    );

    expect(result.characters[0].name).toBe("林夏");
    expect(result.shots[0].videoPrompt).toContain("工作室");
    expect(result.shots[0].voicePrompt).toContain("轻声");
    expect(result.shots[0].taskTags).toContain("script_to_storyboard");
    expect(result.shots[0].ratio).toBe("9:16");
  });

  it("creates a local fallback when JSON has no shots", () => {
    const result = createLocalStoryboard(project);
    expect(result.shots).toHaveLength(4);
    expect(result.characters[0].name).toBeTruthy();
    expect(result.shots[0].taskTags).toContain("shortify-linear");
  });

  it("embeds every built-in workflow into prompts and local fallback", () => {
    for (const workflow of WORKFLOW_DEFINITIONS) {
      const workflowProject = makeProject(workflow.id);
      const prompt = buildStoryboardPrompt(workflowProject);
      const fallback = createLocalStoryboard(workflowProject);

      expect(prompt).toContain(workflow.name);
      expect(prompt).toContain(workflow.sourceProject);
      expect(prompt).toContain(workflow.outputContract);
      expect(fallback.shots[0].taskTags).toContain(workflow.id);
      expect(fallback.shots[0].productionNotes).toContain(workflow.shortName);
    }
  });
});
