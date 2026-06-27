import { contextBridge, ipcRenderer } from "electron";
import type {
  AgentStateForRenderer,
  AppSettings,
  CreateProjectDraft,
  PipelineLog,
  Project,
} from "../src/shared/schema.js";

const api = {
  getState: () => ipcRenderer.invoke("state:get") as Promise<AgentStateForRenderer>,
  saveSettings: (patch: Partial<AppSettings>) => ipcRenderer.invoke("settings:save", patch) as Promise<AgentStateForRenderer>,
  testSettings: (provider: "newapi" | "seedance") => ipcRenderer.invoke("settings:test", provider),
  createProject: (draft: CreateProjectDraft) => ipcRenderer.invoke("project:create", draft) as Promise<AgentStateForRenderer>,
  updateProject: (project: Project) => ipcRenderer.invoke("project:update", project) as Promise<AgentStateForRenderer>,
  deleteProject: (projectId: string) => ipcRenderer.invoke("project:delete", projectId) as Promise<AgentStateForRenderer>,
  activateProject: (projectId: string) => ipcRenderer.invoke("project:activate", projectId) as Promise<AgentStateForRenderer>,
  generateStoryboard: (projectId: string) => ipcRenderer.invoke("agent:generate-storyboard", projectId) as Promise<AgentStateForRenderer>,
  createVideo: (projectId: string, shotId: string, provider: "newapi" | "seedance") =>
    ipcRenderer.invoke("video:create", projectId, shotId, provider) as Promise<AgentStateForRenderer>,
  pollVideo: (jobId: string) => ipcRenderer.invoke("video:poll", jobId) as Promise<AgentStateForRenderer>,
  downloadVideo: (jobId: string) => ipcRenderer.invoke("video:download", jobId),
  pickAssets: () => ipcRenderer.invoke("asset:pick") as Promise<string[]>,
  exportState: () => ipcRenderer.invoke("state:export"),
  importState: () => ipcRenderer.invoke("state:import") as Promise<AgentStateForRenderer>,
  openExternal: (target: string) => ipcRenderer.invoke("shell:open", target),
  onLog: (callback: (entry: PipelineLog) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, entry: PipelineLog) => callback(entry);
    ipcRenderer.on("agent:log", handler);
    return () => {
      ipcRenderer.removeListener("agent:log", handler);
    };
  },
};

contextBridge.exposeInMainWorld("agent", api);

export type AgentBridge = typeof api;
