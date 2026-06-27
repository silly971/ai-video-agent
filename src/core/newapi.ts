import type {
  ImageAspectRatio,
  ImageResolution,
  NewApiImageConfig,
  NewApiModelConfig,
  NewApiModelRole,
  Project,
  Shot,
} from "../shared/schema.js";
import { fetchJson } from "./http.js";
import { buildStoryboardPrompt, createLocalStoryboard, parseStoryboardJson, type StoryboardResult } from "./storyboard.js";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface ImageGenerationResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export interface GeneratedImageResult {
  source: string;
  revisedPrompt?: string;
  raw?: unknown;
}

export async function generateStoryboardWithNewApi(
  project: Project,
  config: NewApiModelConfig,
): Promise<StoryboardResult> {
  if (!config.apiKey || !config.baseUrl || !config.model) {
    return createLocalStoryboard(project);
  }

  const response = await fetchJson<ChatCompletionResponse>(config, "/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: "你是一个专业短视频导演和制片 Agent，只输出可解析 JSON。" },
        { role: "user", content: buildStoryboardPrompt(project) },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(response.error ?? "New API 分析模型生成失败");
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("New API 分析模型没有返回可用内容");
  return parseStoryboardJson(content, project);
}

export async function generateShotImageWithNewApi(
  project: Project,
  shot: Shot,
  config: NewApiImageConfig,
): Promise<GeneratedImageResult> {
  ensureModelReady(config, "New API 生图模型");
  const response = await fetchJson<ImageGenerationResponse>(config, "/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildImageGenerationBody(project, shot, config)),
  });

  if (!response.ok) {
    throw new Error(response.error ?? "New API 生图模型生成失败");
  }

  const item = response.data?.data?.[0];
  const source = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : "");
  if (!source) throw new Error("New API 生图模型没有返回图片 URL 或 base64");
  return {
    source,
    revisedPrompt: item?.revised_prompt,
    raw: response.data,
  };
}

export function buildImageGenerationBody(project: Project, shot: Shot, config: NewApiImageConfig) {
  return {
    model: config.model,
    prompt: enrichImagePrompt(project, shot),
    n: 1,
    resolution: config.resolution,
    aspect_ratio: config.aspectRatio,
    size: imageSizeFromOptions(config.resolution, config.aspectRatio),
  };
}

export async function testNewApiModelConnection(role: Exclude<NewApiModelRole, "video">, config: NewApiModelConfig) {
  const label = role === "analysis" ? "New API 分析模型" : "New API 生图模型";
  if (!config.baseUrl || !config.apiKey) {
    return { ok: false, message: `请先填写${label} Base URL 和 API Key` };
  }
  const result = await fetchJson(config, "/v1/models", { method: "GET" });
  if (result.ok) return { ok: true, message: `${label} /v1/models 可访问`, status: result.status };
  return { ok: false, message: result.error ?? `${label}连接失败`, status: result.status };
}

function ensureModelReady(config: NewApiModelConfig, label: string) {
  if (!config.enabled) throw new Error(`${label}未启用`);
  if (!config.baseUrl) throw new Error(`${label} Base URL 不能为空`);
  if (!config.apiKey) throw new Error(`${label} API Key 不能为空`);
  if (!config.model) throw new Error(`${label}模型不能为空`);
}

function enrichImagePrompt(project: Project, shot: Shot) {
  return [
    shot.imagePrompt || shot.videoPrompt,
    shot.scene ? `场景：${shot.scene}` : "",
    shot.camera ? `构图与镜头：${shot.camera}` : "",
    project.style ? `整体风格：${project.style}` : "",
    "生成一张可作为视频首帧或参考图的清晰画面，主体明确，无水印，无文字乱码。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function imageSizeFromOptions(resolution: ImageResolution, ratio: ImageAspectRatio) {
  const base = resolutionToBasePixels(resolution);
  const [widthRatio, heightRatio] = ratio.split(":").map(Number) as [number, number];
  if (widthRatio >= heightRatio) {
    return `${roundToImageStep((base * widthRatio) / heightRatio)}x${base}`;
  }
  return `${base}x${roundToImageStep((base * heightRatio) / widthRatio)}`;
}

function resolutionToBasePixels(resolution: ImageResolution) {
  switch (resolution) {
    case "4K":
      return 4096;
    case "2K":
      return 2048;
    case "1K":
    default:
      return 1024;
  }
}

function roundToImageStep(value: number) {
  return Math.max(64, Math.round(value / 64) * 64);
}
