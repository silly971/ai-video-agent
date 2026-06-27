import type { Character, Project, Shot } from "../shared/schema.js";

export interface StoryboardResult {
  characters: Character[];
  shots: Shot[];
}

export function buildStoryboardPrompt(project: Project) {
  return `你是一个短视频导演 Agent。请把用户创意拆成可执行的视频制作方案，输出严格 JSON，不要 Markdown。

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
      "camera": "镜头语言",
      "duration": 5
    }
  ]
}

要求：
1. 镜头必须能直接交给视频模型生成。
2. 保持角色视觉一致性。
3. 每个镜头 4-8 秒，镜头数量尽量接近目标值。
4. 语言使用中文，提示词清晰具体。`;
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
  const characterName = inferCharacterName(project.idea);
  const character: Character = {
    id: crypto.randomUUID(),
    name: characterName,
    role: "主角",
    description: "围绕创意展开行动与情绪变化的核心角色",
    visualPrompt: `${characterName}，视觉特征稳定，符合${project.style}`,
    voiceHint: "自然、清晰、有情绪推进",
  };
  const count = Math.max(1, Math.min(12, project.targetShots));
  const beats = ["开场钩子", "角色登场", "冲突升级", "关键转折", "情绪爆发", "结尾记忆点"];
  const shots: Shot[] = Array.from({ length: count }, (_, index) => {
    const beat = beats[index] ?? `推进段落 ${index + 1}`;
    return {
      id: crypto.randomUUID(),
      index: index + 1,
      title: beat,
      scene: index === 0 ? "开场环境" : "连续剧情场景",
      characters: [characterName],
      narration: index === 0 ? project.idea : `${beat}，推动观众继续观看。`,
      dialogue: "",
      imagePrompt: `${project.style}，${project.idea}，${beat}，清晰主体，适合${project.ratio}短视频画面`,
      videoPrompt: `${project.idea}，${beat}，镜头运动自然，人物动作明确，${project.style}，高质量短视频画面`,
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

function inferCharacterName(idea: string) {
  const match = idea.match(/([\u4e00-\u9fa5A-Za-z0-9]{2,8})(?:的|在|和|与)/);
  return match?.[1] ?? "主角";
}
