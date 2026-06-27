import type {
  AgentStateForRenderer,
  AppSettings,
  CreateProjectDraft,
  NewApiModelRole,
  PipelineLog,
  Project,
} from "../shared/schema";

type AgentBridge = {
  getState: () => Promise<AgentStateForRenderer>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<AgentStateForRenderer>;
  testSettings: (role: NewApiModelRole) => Promise<unknown>;
  createProject: (draft: CreateProjectDraft) => Promise<AgentStateForRenderer>;
  updateProject: (project: Project) => Promise<AgentStateForRenderer>;
  deleteProject: (projectId: string) => Promise<AgentStateForRenderer>;
  activateProject: (projectId: string) => Promise<AgentStateForRenderer>;
  generateStoryboard: (projectId: string) => Promise<AgentStateForRenderer>;
  generateImage: (projectId: string, shotId: string) => Promise<AgentStateForRenderer>;
  createVideo: (projectId: string, shotId: string) => Promise<AgentStateForRenderer>;
  pollVideo: (jobId: string) => Promise<AgentStateForRenderer>;
  downloadVideo: (jobId: string) => Promise<unknown>;
  pickAssets: () => Promise<string[]>;
  exportState: () => Promise<unknown>;
  importState: () => Promise<AgentStateForRenderer>;
  openExternal: (target: string) => Promise<unknown>;
  onLog: (callback: (entry: PipelineLog) => void) => () => void;
};

declare global {
  interface Window {
    agent: AgentBridge;
  }
}

export {};
