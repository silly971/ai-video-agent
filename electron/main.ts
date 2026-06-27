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
  type NewApiModelRole,
  type PipelineLog,
  type Project,
  type SceneAsset,
  type Shot,
  type VideoJob,
} from "../src/shared/schema.js";
import {
  generateShotImageWithNewApi,
  generateStoryboardWithNewApi,
  testNewApiModelConnection,
} from "../src/core/newapi.js";
import {
  createVideoTask,
  downloadVideo,
  pollVideoTask,
  testNewApiVideoConnection,
} from "../src/core/video-providers.js";
import { createWorkflowRun, getWorkflowDefinition } from "../src/shared/workflows.js";
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
  const nextProject = refreshWorkflowRun(project);
  state.projects = state.projects.map((item) => (item.id === project.id ? nextProject : item));
}

function refreshWorkflowRun(project: Project): Project {
  const imageCount = project.shots.reduce(
    (count, shot) => count + shot.assets.filter((asset) => asset.kind === "image").length,
    0,
  );
  const videoCount =
    state.jobs.filter((job) => job.projectId === project.id).length ||
    project.shots.filter((shot) => shot.videoJobId || shot.videoStatus !== "idle").length;
  return {
    ...project,
    workflowRun: createWorkflowRun(project.workflowId, {
      planned: project.shots.length > 0,
      imageCount,
      videoCount,
    }),
  };
}

async function createWindow() {
  const preload = path.join(__dirname, "preload.cjs");
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

  ipcMain.handle("settings:test", async (_event, role: NewApiModelRole) => {
    const settings = decryptSettingsForUse(state.settings);
    const result =
      role === "video"
        ? await testNewApiVideoConnection(settings.newApi.video)
        : await testNewApiModelConnection(role, settings.newApi[role]);
    addLog(result.ok ? "success" : "error", `New API ${role} 连接测试${result.ok ? "通过" : "失败"}`, result);
    return result;
  });

  ipcMain.handle("project:create", async (_event, draft: Parameters<typeof createProjectFromDraft>[0]) => {
    const project = createProjectFromDraft(draft);
    state.projects = [project, ...state.projects];
    state.activeProjectId = project.id;
    await persist();
    addLog("success", `已创建项目：${project.name}`, {
      workflow: getWorkflowDefinition(project.workflowId).name,
    });
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
    const workflow = getWorkflowDefinition(project.workflowId);
    addLog("info", `Agent 开始执行${workflow.shortName}工作流`, {
      projectId,
      workflow: workflow.name,
      source: workflow.sourceProject,
    });
    const settings = decryptSettingsForUse(state.settings);
    const result = await generateStoryboardWithNewApi(project, settings.newApi.analysis);
    const updated: Project = {
      ...project,
      characters: result.characters,
      shots: result.shots,
      updatedAt: new Date().toISOString(),
    };
    replaceProject(updated);
    await persist();
    addLog("success", `Agent 已按${workflow.shortName}工作流生成 ${result.shots.length} 个镜头`, {
      characters: result.characters.length,
      shots: result.shots.length,
      workflow: workflow.name,
    });
    return exposeState();
  });

  ipcMain.handle("image:generate", async (_event, projectId: string, shotId: string) => {
    const project = state.projects.find((item) => item.id === projectId);
    const shot = project?.shots.find((item) => item.id === shotId);
    if (!project || !shot) throw new Error("项目或镜头不存在");
    const settings = decryptSettingsForUse(state.settings);
    addLog("info", `提交生图任务：${shot.title}`);
    const result = await generateShotImageWithNewApi(project, shot, settings.newApi.image);
    const asset: SceneAsset = {
      id: crypto.randomUUID(),
      label: "AI 生成首帧",
      kind: "image",
      source: result.source,
      role: "first_frame",
    };
    replaceProject({
      ...project,
      shots: project.shots.map((item) =>
        item.id === shotId
          ? {
              ...item,
              assets: [asset, ...item.assets],
            }
          : item,
      ),
      updatedAt: new Date().toISOString(),
    });
    await persist();
    addLog("success", `首帧图已生成：${shot.title}`, {
      revisedPrompt: result.revisedPrompt,
      source: result.source.startsWith("data:") ? "data:image/*;base64,..." : result.source,
    });
    return exposeState();
  });

  ipcMain.handle("video:create", async (_event, projectId: string, shotId: string) => {
    const project = state.projects.find((item) => item.id === projectId);
    const shot = project?.shots.find((item) => item.id === shotId);
    if (!project || !shot) throw new Error("项目或镜头不存在");
    const settings = decryptSettingsForUse(state.settings);
    const job = createShotVideoJob(project, shot);
    state.jobs = [job, ...state.jobs];
    await persist();
    addLog("info", `提交 New API 视频模型任务：${shot.title}`);
    try {
      const remote = await createVideoTask(project, shot, settings);
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
      addLog("success", `视频任务已创建：${remote.id}`, { provider: "newapi-video" });
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
    const remote = await pollVideoTask(job.remoteId, settings);
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
