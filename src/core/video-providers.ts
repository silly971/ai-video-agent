import fs from "node:fs/promises";
import path from "node:path";
import type {
  AppSettings,
  NewApiVideoConfig,
  Project,
  RemoteVideoTask,
  SceneAsset,
  Shot,
} from "../shared/schema.js";
import { fetchJson } from "./http.js";

export async function createVideoTask(
  project: Project,
  shot: Shot,
  settings: AppSettings,
): Promise<RemoteVideoTask> {
  return createNewApiVideoTask(settings.newApi.video, project, shot);
}

export async function pollVideoTask(remoteId: string, settings: AppSettings) {
  return pollNewApiVideoTask(settings.newApi.video, remoteId);
}

export async function testNewApiVideoConnection(config: NewApiVideoConfig) {
  if (!config.baseUrl || !config.apiKey) {
    return { ok: false, message: "请先填写 New API 视频模型 Base URL 和 API Key" };
  }
  const result = await fetchJson(config, "/v1/videos/test-connection", { method: "GET" });
  if (result.ok || result.status === 404 || result.status === 405) {
    return { ok: true, message: "New API 视频模型网关可访问；正式任务将使用 /v1/videos", status: result.status };
  }
  return { ok: false, message: result.error ?? "New API 视频模型连接失败", status: result.status };
}

async function createNewApiVideoTask(
  config: NewApiVideoConfig,
  project: Project,
  shot: Shot,
): Promise<RemoteVideoTask> {
  ensureVideoModelReady(config);
  const content = await buildVideoContent(shot.assets);
  const body = {
    model: config.model,
    prompt: enrichVideoPrompt(project, shot),
    resolution: config.resolution,
    ratio: shot.ratio || config.ratio,
    duration: shot.duration || config.duration,
    generate_audio: config.generateAudio,
    watermark: config.watermark,
    ...(content.length ? { content } : {}),
  };

  const result = await fetchJson<Record<string, unknown>>(config, "/v1/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!result.ok) throw new Error(result.error ?? "New API 视频模型创建任务失败");
  return extractRemoteTask(result.data, result.data);
}

async function pollNewApiVideoTask(config: NewApiVideoConfig, remoteId: string): Promise<RemoteVideoTask> {
  ensureVideoModelReady(config);
  const result = await fetchJson<Record<string, unknown>>(config, `/v1/videos/${encodeURIComponent(remoteId)}`, {
    method: "GET",
  });
  if (!result.ok) throw new Error(result.error ?? "视频任务查询失败");
  return extractRemoteTask(result.data, result.data);
}

export async function downloadVideo(url: string, targetPath: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下载失败：${response.status} ${response.statusText}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, buffer);
}

function ensureVideoModelReady(config: NewApiVideoConfig) {
  if (!config.enabled) throw new Error("New API 视频模型未启用");
  if (!config.baseUrl) throw new Error("New API 视频模型 Base URL 不能为空");
  if (!config.apiKey) throw new Error("New API 视频模型 API Key 不能为空");
  if (!config.model) throw new Error("New API 视频模型不能为空");
}

function enrichVideoPrompt(project: Project, shot: Shot) {
  return [
    shot.videoPrompt || shot.imagePrompt,
    shot.camera ? `镜头语言：${shot.camera}` : "",
    shot.scene ? `场景：${shot.scene}` : "",
    project.style ? `整体风格：${project.style}` : "",
    "画面清晰，动作明确，避免文字水印和变形肢体。",
  ]
    .filter(Boolean)
    .join("\n");
}

async function buildVideoContent(assets: SceneAsset[]) {
  const content = [];
  for (const asset of assets) {
    const url = isRemoteUrl(asset.source) ? asset.source : await fileToDataUrl(asset.source);
    if (asset.kind === "image") {
      content.push({ type: "image_url", role: asset.role, image_url: { url } });
    }
    if (asset.kind === "video") {
      content.push({ type: "video_url", role: asset.role, video_url: { url } });
    }
    if (asset.kind === "audio") {
      content.push({ type: "audio_url", role: asset.role, audio_url: { url } });
    }
  }
  return content;
}

async function fileToDataUrl(filePath: string) {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "mp3"
          ? "audio/mpeg"
          : ext === "wav"
            ? "audio/wav"
            : ext === "mp4"
              ? "video/mp4"
              : "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//i.test(value) || /^data:/i.test(value);
}

function extractRemoteTask(data: unknown, raw: unknown): RemoteVideoTask {
  const record = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const metadata = (record.metadata && typeof record.metadata === "object" ? record.metadata : {}) as Record<string, unknown>;
  const output = (record.output && typeof record.output === "object" ? record.output : {}) as Record<string, unknown>;
  const id = String(record.id ?? record.task_id ?? record.taskId ?? output.id ?? "");
  if (!id) throw new Error("接口响应中没有任务 ID");
  const error = readError(record) ?? readError(metadata) ?? readError(output);
  return {
    id,
    status: String(record.status ?? output.status ?? "processing"),
    progress: Number(record.progress ?? metadata.progress ?? output.progress ?? 0),
    url: String(record.url ?? metadata.url ?? output.url ?? ""),
    error,
    raw,
  };
}

function readError(data: unknown) {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  const error = record.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const errorRecord = error as Record<string, unknown>;
    return String(errorRecord.message ?? errorRecord.type ?? "");
  }
  if (typeof record.message === "string" && record.status === "failed") return record.message;
  return undefined;
}
