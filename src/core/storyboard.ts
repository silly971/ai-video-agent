import type { Character, Project, Shot } from "../shared/schema.js";
import { getWorkflowDefinition } from "../shared/workflows.js";

export interface StoryboardResult {
  characters: Character[];
  shots: Shot[];
}

export function buildStoryboardPrompt(project: Project) {
  const workflow = getWorkflowDefinition(project.workflowId);
  return `你是一个短视频导演 Agent。请把用户创意拆成可执行的视频制作方案，输出严格 JSON，不要 Markdown。

当前内置工作流：${workflow.name}
参考项目：${workflow.sourceProject}
工作流定位：${workflow.positioning}
适用场景：${workflow.bestFor}
执行方式：${workflow.mode}

工作流内置提示词：
${workflow.operatorPrompt}

工作流阶段：
${workflow.stages
  .map((stage, index) => `${index + 1}. ${stage.title}（${stage.queue}）：${stage.objective} 输出：${stage.output}`)
  .join("\n")}

项目名：${project.name}
创意：${project.idea}
受众：${project.audience}
风格：${project.style}
画幅：${project.ratio}
总时长：${project.duration} 秒
目标镜头数：${project.targetShots}

JSON schema:
{
  "characters": [
    {
      "name": "角色名",
      "role": "主角/配角/旁白",
      "description": "性格、关系、剧情作用",
      "visualPrompt": "保持角色一致性的外观描述",
      "voiceHint": "配音建议"
    }
  ],
  "shots": [
    {
      "title": "镜头标题",
      "scene": "场景",
      "characters": ["角色名"],
      "narration": "旁白",
      "dialogue": "对白",
      "imagePrompt": "用于生成分镜图的提示词",
      "videoPrompt": "用于视频生成的提示词，包含主体、动作、镜头运动、光线、风格",
      "voicePrompt": "用于旁白/对白配音的声音提示",
      "continuityPrompt": "保持角色、场景、道具连续性的提示",
      "productionNotes": "对应工作流阶段、依赖资产、失败后可重试点",
      "taskTags": ["工作流任务标签"],
      "camera": "镜头语言",
      "duration": 5
    }
  ]
}

要求：
1. 镜头必须能直接交给视频模型生成。
2. 保持角色视觉一致性。
3. 每个镜头 4-8 秒，镜头数量尽量接近目标值。
4. 语言使用中文，提示词清晰具体。
5. 必须按当前工作流的阶段和提示词规则组织结果。
6. ${workflow.outputContract}
${workflow.promptRules.map((rule, index) => `${index + 7}. ${rule}`).join("\n")}`;
}

export function parseStoryboardJson(content: string, project: Project): StoryboardResult {
  const json = safeJsonParse(content);
  const characters = Array.isArray(json.characters)
    ? json.characters.map((item: Record<string, unknown>) => ({
        id: crypto.randomUUID(),
        name: readString(item.name, "未命名角色"),
        role: readString(item.role, "角色"),
        description: readString(item.description, ""),
        visualPrompt: readString(item.visualPrompt, ""),
        voiceHint: readString(item.voiceHint, ""),
      }))
    : [];

  const shots = Array.isArray(json.shots)
    ? json.shots.map((item: Record<string, unknown>, index: number) => ({
        id: crypto.randomUUID(),
        index: index + 1,
        title: readString(item.title, `镜头 ${index + 1}`),
        scene: readString(item.scene, ""),
        characters: Array.isArray(item.characters) ? item.characters.map(String) : [],
        narration: readString(item.narration, ""),
        dialogue: readString(item.dialogue, ""),
        imagePrompt: readString(item.imagePrompt, ""),
        videoPrompt: readString(item.videoPrompt, ""),
        voicePrompt: readString(item.voicePrompt, ""),
        continuityPrompt: readString(item.continuityPrompt, ""),
        productionNotes: readString(item.productionNotes, ""),
        taskTags: readStringArray(item.taskTags),
        camera: readString(item.camera, ""),
        duration: Number(item.duration ?? project.duration / Math.max(1, project.targetShots)) || 5,
        ratio: project.ratio,
        assets: [],
        videoStatus: "idle" as const,
      }))
    : [];

  if (!shots.length) {
    return createLocalStoryboard(project);
  }
  return { characters, shots };
}

export function createLocalStoryboard(project: Project): StoryboardResult {
  const workflow = getWorkflowDefinition(project.workflowId);
  const characterName = inferCharacterName(project.idea);
  const character: Character = {
    id: crypto.randomUUID(),
    name: characterName,
    role: "主角",
    description: `围绕创意展开行动与情绪变化的核心角色；按${workflow.shortName}工作流保持可复用设定`,
    visualPrompt: `${characterName}，视觉特征稳定，符合${project.style}，可在${workflow.shortName}工作流的所有镜头复用`,
    voiceHint: "自然、清晰、有情绪推进",
  };
  const count = Math.max(1, Math.min(12, project.targetShots));
  const beats = workflow.fallbackBeats;
  const textStage = workflow.stages.find((stage) => stage.queue === "text") ?? workflow.stages[0];
  const imageStage = workflow.stages.find((stage) => stage.queue === "image");
  const videoStage = workflow.stages.find((stage) => stage.queue === "video");
  const shots: Shot[] = Array.from({ length: count }, (_, index) => {
    const beat = beats[index % beats.length] ?? `推进段落 ${index + 1}`;
    return {
      id: crypto.randomUUID(),
      index: index + 1,
      title: beat,
      scene: index === 0 ? "开场环境" : "连续剧情场景",
      characters: [characterName],
      narration: index === 0 ? project.idea : `${beat}，推动观众继续观看。`,
      dialogue: "",
      imagePrompt: [
        `${project.style}，${project.idea}，${beat}，清晰主体，适合${project.ratio}短视频画面`,
        imageStage ? `阶段目标：${imageStage.objective}` : "",
        `${characterName} 外观保持一致，无水印，无乱码文字`,
      ]
        .filter(Boolean)
        .join("\n"),
      videoPrompt: [
        `${project.idea}，${beat}，镜头运动自然，人物动作明确，${project.style}，高质量短视频画面`,
        videoStage ? `视频阶段：${videoStage.promptFocus}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      voicePrompt: `声音自然清晰，符合${characterName}的角色状态；旁白服务于“${beat}”。`,
      continuityPrompt: `${characterName} 的外观、声音和情绪要与前后镜头连续；画幅保持 ${project.ratio}。`,
      productionNotes: `${workflow.shortName}工作流：${textStage.title}已形成本地草稿；后续可按 ${workflow.stages
        .slice(1)
        .map((stage) => stage.title)
        .join(" -> ")} 继续执行。`,
      taskTags: [workflow.id, textStage.id, imageStage?.id, videoStage?.id].filter(Boolean) as string[],
      camera: index % 2 === 0 ? "平稳推进，突出主体" : "轻微跟拍，强调情绪",
      duration: Math.max(4, Math.round(project.duration / count)),
      ratio: project.ratio,
      assets: [],
      videoStatus: "idle",
    };
  });
  return { characters: [character], shots };
}

function safeJsonParse(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? trimmed;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("模型没有返回 JSON 对象");
  return JSON.parse(fenced.slice(start, end + 1));
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((item) => item.trim()).filter(Boolean);
}

function inferCharacterName(idea: string) {
  const match = idea.match(/([\u4e00-\u9fa5A-Za-z0-9]{2,8})(?:的|在|和|与)/);
  return match?.[1] ?? "主角";
}
