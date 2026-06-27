import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDefaultState,
  createProjectFromDraft,
  createShotVideoJob,
  decryptSettingsForUse,
  importAgentState,
  maskStateForRenderer,
  mergeSettingsPatch,
  normalizeVideoTask,
  type AgentState,
  type AppSettings,
  type PipelineLog,
  type Project,
  type Shot,
  type VideoJob,
} from "../src/shared/schema.js";
import {
  generateStoryboardWithNewApi,
  testNewApiConnection,
} from "../src/core/newapi.js";
import {
  createVideoTask,
  downloadVideo,
  pollVideoTask,
  testSeedanceConnection,
} from "../src/core/video-providers.js";
import { loadState, saveState } from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let state: AgentState = createDefaultState();

function addLog(level: PipelineLog["level"], message: string, details?: unknown) {
  const entry: PipelineLog = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    level,
    message,
    details,
  };
  state.logs = [entry, ...state.logs].slice(0, 500);
  void persist();
  mainWindow?.webContents.send("agent:log", entry);
}

async function persist() {
  await saveState(state);
}

function exposeState() {
  return maskStateForRenderer(state);
}

function replaceProject(project: Project) {
  state.projects = state.projects.map((item) => (item.id === project.id ? project : item));
}

async function createWindow() {
  const preload = path.join(__dirname, "preload.js");
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: "AI Video Agent",
    backgroundColor: "#f6f5ef",
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  ipcMain.handle("state:get", () => exposeState());

  ipcMain.handle("settings:save", async (_event, patch: Partial<AppSettings>) => {
    state.settings = mergeSettingsPatch(state.settings, patch);
    await persist();
    addLog("info", "接口配置已保存");
    return exposeState();
  });

  ipcMain.handle("settings:test", async (_event, provider: "newapi" | "seedance") => {
    const settings = decryptSettingsForUse(state.settings);
    const result =
      provider === "newapi"
        ? await testNewApiConnection(settings.newApi)
        : await testSeedanceConnection(settings.seedance);
    addLog(result.ok ? "success" : "error", `${provider} 连接测试${result.ok ? "通过" : "失败"}`, result);
    return result;
  });

  ipcMain.handle("project:create", async (_event, draft: Parameters<typeof createProjectFromDraft>[0]) => {
    const project = createProjectFromDraft(draft);
    state.projects = [project, ...state.projects];
    state.activeProjectId = project.id;
    await persist();
    addLog("success", `已创建项目：${project.name}`);
    return exposeState();
  });

  ipcMain.handle("project:update", async (_event, project: Project) => {
    replaceProject({ ...project, updatedAt: new Date().toISOString() });
    await persist();
    addLog("info", `项目已更新：${project.name}`);
    return exposeState();
  });

  ipcMain.handle("project:delete", async (_event, projectId: string) => {
    const project = state.projects.find((item) => item.id === projectId);
    state.projects = state.projects.filter((item) => item.id !== projectId);
    state.jobs = state.jobs.filter((job) => job.projectId !== projectId);
    if (state.activeProjectId === projectId) state.activeProjectId = state.projects[0]?.id ?? null;
    await persist();
    addLog("info", `项目已删除：${project?.name ?? projectId}`);
    return exposeState();
  });

  ipcMain.handle("project:activate", async (_event, projectId: string) => {
    state.activeProjectId = projectId;
    await persist();
    return exposeState();
  });

  ipcMain.handle("agent:generate-storyboard", async (_event, projectId: string) => {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) throw new Error("项目不存在");
    addLog("info", "Agent 开始生成剧本结构与分镜", { projectId });
    const settings = decryptSettingsForUse(state.settings);
    const result = await generateStoryboardWithNewApi(project, settings.newApi);
    const updated: Project = {
      ...project,
      characters: result.characters,
      shots: result.shots,
      updatedAt: new Date().toISOString(),
    };
    replaceProject(updated);
    await persist();
    addLog("success", `Agent 已生成 ${result.shots.length} 个镜头`, {
      characters: result.characters.length,
      shots: result.shots.length,
    });
    return exposeState();
  });

  ipcMain.handle("video:create", async (_event, projectId: string, shotId: string, provider: "newapi" | "seedance") => {
    const project = state.projects.find((item) => item.id === projectId);
    const shot = project?.shots.find((item) => item.id === shotId);
    if (!project || !shot) throw new Error("项目或镜头不存在");
    const settings = decryptSettingsForUse(state.settings);
    const job = createShotVideoJob(project, shot, provider);
    state.jobs = [job, ...state.jobs];
    await persist();
    addLog("info", `提交视频任务：${shot.title}`, { provider });
    try {
      const remote = await createVideoTask(provider, project, shot, settings);
      const updatedJob: VideoJob = {
        ...job,
        remoteId: remote.id,
        status: normalizeVideoTask(remote).status,
        progress: normalizeVideoTask(remote).progress,
        resultUrl: normalizeVideoTask(remote).url,
        rawResponse: remote.raw,
        updatedAt: new Date().toISOString(),
      };
      state.jobs = state.jobs.map((item) => (item.id === job.id ? updatedJob : item));
      const updatedShot: Shot = { ...shot, videoJobId: updatedJob.id, videoStatus: updatedJob.status };
      replaceProject({
        ...project,
        shots: project.shots.map((item) => (item.id === shotId ? updatedShot : item)),
        updatedAt: new Date().toISOString(),
      });
      await persist();
      addLog("success", `视频任务已创建：${remote.id}`, { provider });
    } catch (error) {
      const updatedJob: VideoJob = {
        ...job,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        updatedAt: new Date().toISOString(),
      };
      state.jobs = state.jobs.map((item) => (item.id === job.id ? updatedJob : item));
      await persist();
      addLog("error", "视频任务创建失败", updatedJob.error);
    }
    return exposeState();
  });

  ipcMain.handle("video:poll", async (_event, jobId: string) => {
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job || !job.remoteId) throw new Error("任务不存在或尚未获得远端 ID");
    const settings = decryptSettingsForUse(state.settings);
    const remote = await pollVideoTask(job.provider, job.remoteId, settings);
    const normalized = normalizeVideoTask(remote);
    const updatedJob: VideoJob = {
      ...job,
      status: normalized.status,
      progress: normalized.progress,
      resultUrl: normalized.url,
      error: normalized.error,
      rawResponse: remote.raw,
      updatedAt: new Date().toISOString(),
    };
    state.jobs = state.jobs.map((item) => (item.id === job.id ? updatedJob : item));
    const project = state.projects.find((item) => item.id === job.projectId);
    if (project) {
      replaceProject({
        ...project,
        shots: project.shots.map((shot) =>
          shot.id === job.shotId
            ? { ...shot, videoJobId: updatedJob.id, videoStatus: updatedJob.status, videoUrl: updatedJob.resultUrl ?? shot.videoUrl }
            : shot,
        ),
        updatedAt: new Date().toISOString(),
      });
    }
    await persist();
    addLog("info", `任务进度更新：${normalized.progress}%`, { jobId, status: normalized.status });
    return exposeState();
  });

  ipcMain.handle("video:download", async (_event, jobId: string) => {
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job?.resultUrl) throw new Error("任务没有可下载的视频链接");
    const options = {
      defaultPath: `${job.shotTitle || "video"}.mp4`,
      filters: [{ name: "MP4 Video", extensions: ["mp4"] }],
    };
    const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    await downloadVideo(job.resultUrl, result.filePath);
    addLog("success", "视频已保存到本地", result.filePath);
    return { ok: true, path: result.filePath };
  });

  ipcMain.handle("asset:pick", async () => {
    const options = {
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Media", extensions: ["png", "jpg", "jpeg", "webp", "mp4", "mov", "mp3", "wav"] },
        { name: "All Files", extensions: ["*"] },
      ],
    } satisfies Electron.OpenDialogOptions;
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle("state:export", async () => {
    const options = {
      defaultPath: "ai-video-agent-project.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    };
    const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return { ok: false };
    await saveState(state, result.filePath);
    addLog("success", "工作区已导出", result.filePath);
    return { ok: true, path: result.filePath };
  });

  ipcMain.handle("state:import", async () => {
    const options = {
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    } satisfies Electron.OpenDialogOptions;
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return exposeState();
    const imported = await loadState(result.filePaths[0]);
    state = importAgentState(state, imported);
    await persist();
    addLog("success", "工作区已导入", result.filePaths[0]);
    return exposeState();
  });

  ipcMain.handle("shell:open", async (_event, target: string) => {
    await shell.openExternal(target);
    return true;
  });
}

app.whenReady().then(async () => {
  state = await loadState();
  registerIpcHandlers();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
