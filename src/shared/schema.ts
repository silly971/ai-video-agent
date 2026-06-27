import { z } from "zod";

export type ProviderId = "newapi" | "seedance";
export type VideoStatus = "idle" | "queued" | "running" | "succeeded" | "failed";

export interface ProviderConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  headersJson: string;
  timeoutSeconds: number;
}

export interface NewApiConfig extends ProviderConfig {
  chatModel: string;
  videoModel: string;
  imageModel: string;
  audioModel: string;
}

export interface SeedanceConfig extends ProviderConfig {
  resolution: "480p" | "720p" | "1080p";
  ratio: "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "adaptive";
  duration: number;
  generateAudio: boolean;
  watermark: boolean;
}

export interface AppSettings {
  defaultProvider: ProviderId;
  saveRawResponses: boolean;
  newApi: NewApiConfig;
  seedance: SeedanceConfig;
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
  schemaVersion: 1;
  settings: AppSettings;
  projects: Project[];
  activeProjectId: string | null;
  jobs: VideoJob[];
  logs: PipelineLog[];
}

export type AgentStateForRenderer = AgentState & {
  settings: AppSettings & {
    newApi: NewApiConfig & { hasApiKey: boolean; apiKey: string };
    seedance: SeedanceConfig & { hasApiKey: boolean; apiKey: string };
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
    defaultProvider: "seedance",
    saveRawResponses: true,
    newApi: {
      enabled: true,
      baseUrl: "https://your-newapi.example.com",
      apiKey: "",
      model: "gpt-4o-mini",
      chatModel: "gpt-4o-mini",
      videoModel: "wan2.5-t2v-preview",
      imageModel: "gpt-image-1",
      audioModel: "tts-1",
      headersJson: "{}",
      timeoutSeconds: 120,
    },
    seedance: {
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
  };
}

export function createDefaultState(): AgentState {
  return {
    schemaVersion: 1,
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
    schemaVersion: 1,
    settings: {
      ...defaults.settings,
      ...candidate.settings,
      newApi: {
        ...defaults.settings.newApi,
        ...candidate.settings?.newApi,
      },
      seedance: {
        ...defaults.settings.seedance,
        ...candidate.settings?.seedance,
      },
    },
    projects: Array.isArray(candidate.projects) ? candidate.projects : [],
    jobs: Array.isArray(candidate.jobs) ? candidate.jobs : [],
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
        ...state.settings.newApi,
        hasApiKey: Boolean(state.settings.newApi.apiKey),
        apiKey: maskSecret(state.settings.newApi.apiKey),
      },
      seedance: {
        ...state.settings.seedance,
        hasApiKey: Boolean(state.settings.seedance.apiKey),
        apiKey: maskSecret(state.settings.seedance.apiKey),
      },
    },
  };
}

export function decryptSettingsForUse(settings: AppSettings): AppSettings {
  return settings;
}

export function mergeSettingsPatch(current: AppSettings, patch: Partial<AppSettings>): AppSettings {
  const next = {
    ...current,
    ...patch,
    newApi: {
      ...current.newApi,
      ...patch.newApi,
    },
    seedance: {
      ...current.seedance,
      ...patch.seedance,
    },
  };
  if (patch.newApi?.apiKey === "" || patch.newApi?.apiKey?.includes("...")) {
    next.newApi.apiKey = current.newApi.apiKey;
  }
  if (patch.seedance?.apiKey === "" || patch.seedance?.apiKey?.includes("...")) {
    next.seedance.apiKey = current.seedance.apiKey;
  }
  return next;
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

export function createShotVideoJob(project: Project, shot: Shot, provider: ProviderId): VideoJob {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    shotId: shot.id,
    shotTitle: shot.title,
    provider,
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
