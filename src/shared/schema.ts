import { z } from "zod";

export type ProviderId = "newapi-video";
export type NewApiModelRole = "analysis" | "image" | "video";
export type VideoStatus = "idle" | "queued" | "running" | "succeeded" | "failed";

export interface ProviderConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  headersJson: string;
  timeoutSeconds: number;
}

export interface NewApiModelConfig extends ProviderConfig {}

export interface NewApiVideoConfig extends ProviderConfig {
  resolution: "480p" | "720p" | "1080p";
  ratio: "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "adaptive";
  duration: number;
  generateAudio: boolean;
  watermark: boolean;
}

export interface NewApiSettings {
  analysis: NewApiModelConfig;
  image: NewApiModelConfig;
  video: NewApiVideoConfig;
}

export interface AppSettings {
  saveRawResponses: boolean;
  newApi: NewApiSettings;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  visualPrompt: string;
  voiceHint: string;
}

export interface SceneAsset {
  id: string;
  label: string;
  kind: "image" | "video" | "audio";
  source: string;
  role: "first_frame" | "last_frame" | "reference_image" | "reference_video" | "reference_audio";
}

export interface Shot {
  id: string;
  index: number;
  title: string;
  scene: string;
  characters: string[];
  narration: string;
  dialogue: string;
  imagePrompt: string;
  videoPrompt: string;
  camera: string;
  duration: number;
  ratio: string;
  assets: SceneAsset[];
  videoJobId?: string;
  videoStatus: VideoStatus;
  videoUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  idea: string;
  audience: string;
  style: string;
  ratio: string;
  duration: number;
  targetShots: number;
  status: "draft" | "planned" | "generating" | "ready";
  characters: Character[];
  shots: Shot[];
  createdAt: string;
  updatedAt: string;
}

export interface VideoJob {
  id: string;
  projectId: string;
  shotId: string;
  shotTitle: string;
  provider: ProviderId;
  remoteId?: string;
  status: VideoStatus;
  progress: number;
  resultUrl?: string;
  error?: string;
  rawResponse?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineLog {
  id: string;
  at: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  details?: unknown;
}

export interface AgentState {
  schemaVersion: 2;
  settings: AppSettings;
  projects: Project[];
  activeProjectId: string | null;
  jobs: VideoJob[];
  logs: PipelineLog[];
}

export type AgentStateForRenderer = AgentState & {
  settings: AppSettings & {
    newApi: {
      analysis: NewApiModelConfig & { hasApiKey: boolean; apiKey: string };
      image: NewApiModelConfig & { hasApiKey: boolean; apiKey: string };
      video: NewApiVideoConfig & { hasApiKey: boolean; apiKey: string };
    };
  };
};

export interface CreateProjectDraft {
  name: string;
  idea: string;
  audience: string;
  style: string;
  ratio: string;
  duration: number;
  targetShots: number;
}

export interface RemoteVideoTask {
  id: string;
  status?: string;
  progress?: number;
  url?: string;
  error?: string;
  raw?: unknown;
}

export interface NormalizedVideoTask {
  status: VideoStatus;
  progress: number;
  url?: string;
  error?: string;
}

export const createProjectDraftSchema = z.object({
  name: z.string().min(1),
  idea: z.string().min(1),
  audience: z.string().default("短视频观众"),
  style: z.string().default("电影感、节奏清晰、适合短视频"),
  ratio: z.string().default("9:16"),
  duration: z.coerce.number().min(4).max(180).default(30),
  targetShots: z.coerce.number().min(1).max(40).default(6),
});

export function createDefaultSettings(): AppSettings {
  return {
    saveRawResponses: true,
    newApi: {
      analysis: {
        enabled: true,
        baseUrl: "https://your-newapi.example.com",
        apiKey: "",
        model: "gpt-4o-mini",
        headersJson: "{}",
        timeoutSeconds: 120,
      },
      image: {
        enabled: true,
        baseUrl: "https://your-newapi.example.com",
        apiKey: "",
        model: "gpt-image-1",
        headersJson: "{}",
        timeoutSeconds: 180,
      },
      video: {
        enabled: true,
        baseUrl: "https://seedance.muyuan.do",
        apiKey: "",
        model: "doubao-seedance-2-0-fast-260128",
        headersJson: "{}",
        timeoutSeconds: 120,
        resolution: "720p",
        ratio: "9:16",
        duration: 5,
        generateAudio: true,
        watermark: false,
      },
    },
  };
}

export function createDefaultState(): AgentState {
  return {
    schemaVersion: 2,
    settings: createDefaultSettings(),
    projects: [],
    activeProjectId: null,
    jobs: [],
    logs: [],
  };
}

export function migrateAgentState(input: unknown): AgentState {
  const defaults = createDefaultState();
  if (!input || typeof input !== "object") return defaults;
  const candidate = input as Partial<AgentState>;
  return {
    ...defaults,
    ...candidate,
    schemaVersion: 2,
    settings: migrateSettings(candidate.settings),
    projects: Array.isArray(candidate.projects) ? candidate.projects : [],
    jobs: Array.isArray(candidate.jobs) ? candidate.jobs.map(migrateVideoJob) : [],
    logs: Array.isArray(candidate.logs) ? candidate.logs : [],
    activeProjectId: candidate.activeProjectId ?? null,
  };
}

export function maskSecret(value: string) {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function maskStateForRenderer(state: AgentState): AgentStateForRenderer {
  return {
    ...state,
    settings: {
      ...state.settings,
      newApi: {
        analysis: maskConfig(state.settings.newApi.analysis),
        image: maskConfig(state.settings.newApi.image),
        video: maskConfig(state.settings.newApi.video),
      },
    },
  };
}

export function decryptSettingsForUse(settings: AppSettings): AppSettings {
  return settings;
}

export function mergeSettingsPatch(current: AppSettings, patch: Partial<AppSettings>): AppSettings {
  return {
    ...current,
    ...patch,
    newApi: {
      ...current.newApi,
      ...patch.newApi,
      analysis: mergeConfigPatch(current.newApi.analysis, patch.newApi?.analysis),
      image: mergeConfigPatch(current.newApi.image, patch.newApi?.image),
      video: mergeConfigPatch(current.newApi.video, patch.newApi?.video),
    },
  };
}

export function createProjectFromDraft(draftInput: CreateProjectDraft): Project {
  const draft = createProjectDraftSchema.parse(draftInput);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: draft.name,
    idea: draft.idea,
    audience: draft.audience,
    style: draft.style,
    ratio: draft.ratio,
    duration: draft.duration,
    targetShots: draft.targetShots,
    status: "draft",
    characters: [],
    shots: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createShotVideoJob(project: Project, shot: Shot): VideoJob {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    shotId: shot.id,
    shotTitle: shot.title,
    provider: "newapi-video",
    status: "queued",
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeVideoTask(remote: RemoteVideoTask): NormalizedVideoTask {
  const statusText = String(remote.status ?? "").toLowerCase();
  let status: VideoStatus = "running";
  if (["queued", "pending", "submitted", "created"].includes(statusText)) status = "queued";
  if (["running", "processing", "in_progress", "generating"].includes(statusText)) status = "running";
  if (["succeeded", "success", "completed", "complete", "done"].includes(statusText)) status = "succeeded";
  if (["failed", "error", "cancelled", "canceled"].includes(statusText)) status = "failed";
  const progress = Math.max(0, Math.min(100, Number(remote.progress ?? (status === "succeeded" ? 100 : 0))));
  return {
    status,
    progress,
    url: remote.url,
    error: remote.error,
  };
}

export function importAgentState(current: AgentState, imported: AgentState): AgentState {
  return {
    ...current,
    projects: imported.projects,
    activeProjectId: imported.activeProjectId,
    jobs: imported.jobs,
    logs: imported.logs,
  };
}

function migrateSettings(input: unknown): AppSettings {
  const defaults = createDefaultSettings();
  if (!input || typeof input !== "object") return defaults;

  const legacy = input as Record<string, unknown>;
  const legacyNewApi = objectValue(legacy.newApi);
  const legacySeedance = objectValue(legacy.seedance);
  const nestedNewApi = looksLikeNestedNewApi(legacyNewApi);

  if (nestedNewApi) {
    return {
      saveRawResponses: Boolean(legacy.saveRawResponses ?? defaults.saveRawResponses),
      newApi: {
        analysis: mergeConfigPatch(defaults.newApi.analysis, legacyNewApi.analysis as Partial<NewApiModelConfig>),
        image: mergeConfigPatch(defaults.newApi.image, legacyNewApi.image as Partial<NewApiModelConfig>),
        video: mergeConfigPatch(defaults.newApi.video, legacyNewApi.video as Partial<NewApiVideoConfig>),
      },
    };
  }

  const flatAnalysis = flatProviderPatch(legacyNewApi, legacyNewApi.chatModel ?? legacyNewApi.model);
  const flatImage = flatProviderPatch(legacyNewApi, legacyNewApi.imageModel ?? legacyNewApi.model);
  const flatVideo = flatProviderPatch(legacyNewApi, legacyNewApi.videoModel ?? legacyNewApi.model);

  return {
    saveRawResponses: Boolean(legacy.saveRawResponses ?? defaults.saveRawResponses),
    newApi: {
      analysis: {
        ...defaults.newApi.analysis,
        ...flatAnalysis,
      },
      image: {
        ...defaults.newApi.image,
        ...flatImage,
      },
      video: {
        ...defaults.newApi.video,
        ...flatVideo,
        ...compact(legacySeedance),
      },
    },
  };
}

function migrateVideoJob(job: VideoJob): VideoJob {
  return {
    ...job,
    provider: "newapi-video",
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function looksLikeNestedNewApi(value: Record<string, unknown>) {
  return Boolean(value.analysis || value.image || value.video);
}

function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}

function flatProviderPatch(source: Record<string, unknown>, model: unknown): Partial<ProviderConfig> {
  return compact({
    enabled: source.enabled,
    baseUrl: source.baseUrl,
    apiKey: source.apiKey,
    model,
    headersJson: source.headersJson,
    timeoutSeconds: source.timeoutSeconds,
  }) as Partial<ProviderConfig>;
}

function maskConfig<T extends ProviderConfig>(config: T): T & { hasApiKey: boolean; apiKey: string } {
  return {
    ...config,
    hasApiKey: Boolean(config.apiKey),
    apiKey: maskSecret(config.apiKey),
  };
}

function mergeConfigPatch<T extends ProviderConfig>(current: T, patch?: Partial<T>): T {
  const cleanPatch = cleanConfigPatch<T>(patch);
  const next = {
    ...current,
    ...cleanPatch,
  };
  if (!patch || shouldPreserveSecret(patch.apiKey)) {
    next.apiKey = current.apiKey;
  }
  return next;
}

function cleanConfigPatch<T extends ProviderConfig>(patch?: Partial<T>): Partial<T> {
  if (!patch) return {};
  const source = patch as Record<string, unknown>;
  return compact({
    enabled: source.enabled,
    baseUrl: source.baseUrl,
    apiKey: source.apiKey,
    model: source.model,
    headersJson: source.headersJson,
    timeoutSeconds: source.timeoutSeconds,
    resolution: source.resolution,
    ratio: source.ratio,
    duration: source.duration,
    generateAudio: source.generateAudio,
    watermark: source.watermark,
  }) as Partial<T>;
}

function shouldPreserveSecret(value: string | undefined) {
  return value === undefined || value === "" || value.includes("...") || value === "****";
}
