import fs from "node:fs/promises";
import path from "node:path";
import type {
  AppSettings,
  NewApiConfig,
  Project,
  ProviderId,
  RemoteVideoTask,
  SceneAsset,
  SeedanceConfig,
  Shot,
} from "../shared/schema.js";
import { fetchJson, joinUrl, parseHeadersJson } from "./http.js";

export async function createVideoTask(
  provider: ProviderId,
  project: Project,
  shot: Shot,
  settings: AppSettings,
): Promise<RemoteVideoTask> {
  if (provider === "seedance") return createSeedanceTask(settings.seedance, project, shot);
  return createNewApiVideoTask(settings.newApi, project, shot);
}

export async function pollVideoTask(provider: ProviderId, remoteId: string, settings: AppSettings) {
  if (provider === "seedance") return pollGenericJsonTask(settings.seedance, remoteId, "seedance");
  return pollGenericJsonTask(settings.newApi, remoteId, "newapi");
}

export async function testSeedanceConnection(config: SeedanceConfig) {
  if (!config.baseUrl || !config.apiKey) {
    return { ok: false, message: "请先填写 Seedance Base URL 和 API Key" };
  }
  const result = await fetchJson(config, "/v1/videos/test-connection", { method: "GET" });
  if (result.ok || result.status === 404 || result.status === 405) {
    return { ok: true, message: "Seedance 网关可访问；正式任务将使用 /v1/videos", status: result.status };
  }
  return { ok: false, message: result.error ?? "Seedance 连接失败", status: result.status };
}

async function createSeedanceTask(config: SeedanceConfig, project: Project, shot: Shot): Promise<RemoteVideoTask> {
  ensureProviderReady(config, "Seedance");
  const content = await buildSeedanceContent(shot.assets);
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
  if (!result.ok) throw new Error(result.error ?? "Seedance 创建视频任务失败");
  return extractRemoteTask(result.data, result.data);
}

async function createNewApiVideoTask(config: NewApiConfig, project: Project, shot: Shot): Promise<RemoteVideoTask> {
  ensureProviderReady(config, "New API");
  const form = new FormData();
  form.append("prompt", enrichVideoPrompt(project, shot));
  form.append("model", config.videoModel || config.model);
  form.append("seconds", String(Math.max(1, Math.round(shot.duration))));
  form.append("size", ratioToNewApiSize(shot.ratio || project.ratio));

  const metadata: Record<string, unknown> = {
    watermark: false,
    prompt_extend: true,
  };
  for (const asset of shot.assets) {
    if (asset.kind === "image" && isRemoteUrl(asset.source)) {
      metadata.img_url ??= asset.source;
      if (asset.role === "first_frame") metadata.first_frame_url = asset.source;
      if (asset.role === "last_frame") metadata.last_frame_url = asset.source;
    } else if (asset.kind === "image") {
      const file = await fs.readFile(asset.source);
      form.append("input_reference", new Blob([file]), path.basename(asset.source));
    }
  }
  form.append("metadata", JSON.stringify(metadata));

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    ...parseHeadersJson(config.headersJson),
  };
  const response = await fetch(joinUrl(config.baseUrl, "/v1/videos"), {
    method: "POST",
    headers,
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readError(data) ?? `New API 创建视频任务失败 (${response.status})`);
  }
  return extractRemoteTask(data, data);
}

async function pollGenericJsonTask(
  config: NewApiConfig | SeedanceConfig,
  remoteId: string,
  provider: ProviderId,
): Promise<RemoteVideoTask> {
  ensureProviderReady(config, provider === "seedance" ? "Seedance" : "New API");
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

function ensureProviderReady(config: NewApiConfig | SeedanceConfig, label: string) {
  if (!config.enabled) throw new Error(`${label} 未启用`);
  if (!config.baseUrl) throw new Error(`${label} Base URL 不能为空`);
  if (!config.apiKey) throw new Error(`${label} API Key 不能为空`);
  if (!config.model) throw new Error(`${label} 模型不能为空`);
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

async function buildSeedanceContent(assets: SceneAsset[]) {
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

function ratioToNewApiSize(ratio: string) {
  switch (ratio) {
    case "16:9":
      return "1920x1080";
    case "1:1":
      return "1440x1440";
    case "4:3":
      return "1440x1080";
    case "3:4":
      return "1080x1440";
    case "9:16":
    default:
      return "1080x1920";
  }
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
