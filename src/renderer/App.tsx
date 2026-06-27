import {
  Bot,
  Clapperboard,
  Download,
  ExternalLink,
  FileInput,
  Film,
  FolderPlus,
  Gauge,
  Link,
  ListVideo,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  AgentStateForRenderer,
  AppSettings,
  Character,
  CreateProjectDraft,
  ImageAspectRatio,
  ImageResolution,
  NewApiModelRole,
  PipelineLog,
  Project,
  SceneAsset,
  Shot,
  VideoJob,
} from "../shared/schema";

type View = "studio" | "projects" | "storyboard" | "video" | "settings" | "logs";

const emptyDraft: CreateProjectDraft = {
  name: "",
  idea: "",
  audience: "短视频观众",
  style: "电影感、节奏清晰、真实自然、适合短视频平台",
  ratio: "9:16",
  duration: 30,
  targetShots: 6,
};

const roleOptions: SceneAsset["role"][] = [
  "first_frame",
  "last_frame",
  "reference_image",
  "reference_video",
  "reference_audio",
];

const imageResolutionOptions: ImageResolution[] = ["1K", "2K", "4K"];
const imageAspectRatioOptions: ImageAspectRatio[] = ["1:1", "3:2", "2:3", "16:9", "9:16", "4:3", "3:4", "21:9"];

function App() {
  const [state, setState] = useState<AgentStateForRenderer | null>(null);
  const [view, setView] = useState<View>("studio");
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<CreateProjectDraft>(emptyDraft);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null);
  const [notice, setNotice] = useState("");
  const [assetForms, setAssetForms] = useState<Record<string, Partial<SceneAsset>>>({});

  useEffect(() => {
    window.agent.getState().then((next) => {
      setState(next);
      setSettingsDraft(next.settings);
    });
    return window.agent.onLog((entry: PipelineLog) => {
      setState((current) => (current ? { ...current, logs: [entry, ...current.logs].slice(0, 500) } : current));
    });
  }, []);

  const activeProject = useMemo(() => {
    if (!state) return null;
    return state.projects.find((project) => project.id === state.activeProjectId) ?? state.projects[0] ?? null;
  }, [state]);

  async function run<T>(label: string, action: () => Promise<T>, success?: string) {
    setBusy(label);
    setNotice("");
    try {
      const result = await action();
      if (isAgentState(result)) setState(result);
      if (success) setNotice(success);
      return result;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setBusy(null);
    }
  }

  async function createProject() {
    await run("create-project", async () => window.agent.createProject(draft), "项目已创建");
    setDraft(emptyDraft);
    setView("storyboard");
  }

  async function updateProject(project: Project) {
    await run("update-project", () => window.agent.updateProject(project));
  }

  async function saveSettings() {
    if (!settingsDraft) return;
    await run("save-settings", () => window.agent.saveSettings(settingsDraft), "接口配置已保存");
  }

  function updateShot(project: Project, shotId: string, patch: Partial<Shot>) {
    const next = {
      ...project,
      shots: project.shots.map((shot) => (shot.id === shotId ? { ...shot, ...patch } : shot)),
    };
    void updateProject(next);
  }

  function updateCharacter(project: Project, characterId: string, patch: Partial<Character>) {
    const next = {
      ...project,
      characters: project.characters.map((character) =>
        character.id === characterId ? { ...character, ...patch } : character,
      ),
    };
    void updateProject(next);
  }

  async function addLocalAssets(project: Project, shot: Shot) {
    const paths = await window.agent.pickAssets();
    if (!paths.length) return;
    const assets = paths.map((source) => ({
      id: crypto.randomUUID(),
      label: source.split(/[\\/]/).pop() ?? "素材",
      kind: inferAssetKind(source),
      source,
      role: inferAssetRole(source),
    }));
    updateShot(project, shot.id, { assets: [...shot.assets, ...assets] });
  }

  function addUrlAsset(project: Project, shot: Shot) {
    const form = assetForms[shot.id];
    if (!form?.source?.trim()) return;
    const asset: SceneAsset = {
      id: crypto.randomUUID(),
      label: form.label?.trim() || "在线素材",
      kind: form.kind ?? "image",
      source: form.source.trim(),
      role: form.role ?? "reference_image",
    };
    updateShot(project, shot.id, { assets: [...shot.assets, asset] });
    setAssetForms((forms) => ({ ...forms, [shot.id]: {} }));
  }

  if (!state || !settingsDraft) {
    return (
      <div className="boot">
        <Loader2 className="spin" />
        <span>正在启动 AI Video Agent</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Clapperboard size={22} />
          </div>
          <div>
            <strong>AI Video Agent</strong>
            <span>桌面端创作工作台</span>
          </div>
        </div>
        <nav className="nav">
          <NavButton view="studio" current={view} icon={<Gauge />} label="工作台" onClick={setView} />
          <NavButton view="projects" current={view} icon={<FolderPlus />} label="项目" onClick={setView} />
          <NavButton view="storyboard" current={view} icon={<ListVideo />} label="分镜" onClick={setView} />
          <NavButton view="video" current={view} icon={<Film />} label="视频任务" onClick={setView} />
          <NavButton view="settings" current={view} icon={<Settings />} label="接口配置" onClick={setView} />
          <NavButton view="logs" current={view} icon={<FileInput />} label="日志" onClick={setView} />
        </nav>
        <div className="sidebar-footer">
          <button className="ghost-button" onClick={() => window.agent.exportState()}>
            <Download size={16} />
            导出工作区
          </button>
          <button
            className="ghost-button"
            onClick={() => run("import-state", () => window.agent.importState(), "工作区已导入")}
          >
            <Upload size={16} />
            导入工作区
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">当前项目</p>
            <h1>{activeProject?.name ?? "先创建一个视频项目"}</h1>
          </div>
          <div className="top-actions">
            {notice && <span className="notice">{notice}</span>}
            {busy && (
              <span className="busy">
                <Loader2 className="spin" size={16} />
                处理中
              </span>
            )}
            <button className="primary-button" onClick={() => setView("projects")}>
              <FolderPlus size={16} />
              新建
            </button>
          </div>
        </header>

        {view === "studio" && <Studio state={state} project={activeProject} setView={setView} busy={busy} />}
        {view === "projects" && (
          <Projects
            state={state}
            draft={draft}
            setDraft={setDraft}
            createProject={createProject}
            activate={(id) => run("activate-project", () => window.agent.activateProject(id))}
            remove={(id) => run("delete-project", () => window.agent.deleteProject(id), "项目已删除")}
          />
        )}
        {view === "storyboard" && activeProject && (
          <Storyboard
            project={activeProject}
            busy={busy}
            generate={() =>
              run("generate-storyboard", () => window.agent.generateStoryboard(activeProject.id), "分镜已生成")
            }
            updateShot={updateShot}
            updateCharacter={updateCharacter}
            addLocalAssets={addLocalAssets}
            addUrlAsset={addUrlAsset}
            generateImage={(shotId) =>
              run("generate-image", () => window.agent.generateImage(activeProject.id, shotId), "首帧图已生成")
            }
            assetForms={assetForms}
            setAssetForms={setAssetForms}
          />
        )}
        {view === "storyboard" && !activeProject && <EmptyProject setView={setView} />}
        {view === "video" && activeProject && (
          <VideoTasks
            state={state}
            project={activeProject}
            createVideo={(shotId) =>
              run("create-video", () => window.agent.createVideo(activeProject.id, shotId), "视频任务已提交")
            }
            poll={(jobId) => run("poll-video", () => window.agent.pollVideo(jobId), "任务状态已刷新")}
            download={(jobId) => run("download-video", () => window.agent.downloadVideo(jobId))}
            busy={busy}
          />
        )}
        {view === "video" && !activeProject && <EmptyProject setView={setView} />}
        {view === "settings" && (
          <SettingsView
            settings={settingsDraft}
            setSettings={setSettingsDraft}
            save={saveSettings}
            test={(role) => run(`test-${role}`, () => window.agent.testSettings(role))}
            busy={busy}
          />
        )}
        {view === "logs" && <Logs logs={state.logs} />}
      </main>
    </div>
  );
}

function NavButton({
  view,
  current,
  icon,
  label,
  onClick,
}: {
  view: View;
  current: View;
  icon: React.ReactNode;
  label: string;
  onClick: (view: View) => void;
}) {
  return (
    <button className={`nav-button ${view === current ? "active" : ""}`} onClick={() => onClick(view)}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Studio({
  state,
  project,
  setView,
  busy,
}: {
  state: AgentStateForRenderer;
  project: Project | null;
  setView: (view: View) => void;
  busy: string | null;
}) {
  const jobs = project ? state.jobs.filter((job) => job.projectId === project.id) : [];
  const succeeded = jobs.filter((job) => job.status === "succeeded").length;
  return (
    <section className="stack">
      <div className="metric-grid">
        <Metric label="项目" value={state.projects.length} icon={<FolderPlus />} />
        <Metric label="镜头" value={project?.shots.length ?? 0} icon={<ListVideo />} />
        <Metric label="任务" value={jobs.length} icon={<Film />} />
        <Metric label="完成" value={succeeded} icon={<Sparkles />} />
      </div>
      <div className="panel hero-panel">
        <div>
          <p className="eyebrow">Agent Pipeline</p>
          <h2>从创意到可下载视频任务</h2>
          <p>
            工作流整合了参考项目中的剧本拆解、角色一致性、素材管理、多模型配置和视频任务轮询。接口配置保存在本机，API Key 不写入仓库。
          </p>
        </div>
        <div className="workflow">
          <button onClick={() => setView("projects")}>
            <FolderPlus size={18} />
            项目
          </button>
          <button onClick={() => setView("storyboard")} disabled={!project || Boolean(busy)}>
            <Wand2 size={18} />
            分镜
          </button>
          <button onClick={() => setView("video")} disabled={!project}>
            <Play size={18} />
            视频
          </button>
          <button onClick={() => setView("settings")}>
            <Settings size={18} />
            配置
          </button>
        </div>
      </div>
      {project && (
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">项目摘要</p>
              <h2>{project.idea}</h2>
            </div>
            <span className="pill">{project.status}</span>
          </div>
          <div className="summary-grid">
            <span>受众：{project.audience}</span>
            <span>风格：{project.style}</span>
            <span>画幅：{project.ratio}</span>
            <span>时长：{project.duration}s</span>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="metric">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

function Projects({
  state,
  draft,
  setDraft,
  createProject,
  activate,
  remove,
}: {
  state: AgentStateForRenderer;
  draft: CreateProjectDraft;
  setDraft: (draft: CreateProjectDraft) => void;
  createProject: () => void;
  activate: (id: string) => void;
  remove: (id: string) => void;
}) {
  return (
    <section className="two-column">
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">新建项目</p>
            <h2>输入创意，交给 Agent 拆解</h2>
          </div>
        </div>
        <FormGrid>
          <Field label="项目名">
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="画幅">
            <select value={draft.ratio} onChange={(event) => setDraft({ ...draft, ratio: event.target.value })}>
              {["9:16", "16:9", "1:1", "4:3", "3:4", "adaptive"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="总时长">
            <input
              type="number"
              min={4}
              value={draft.duration}
              onChange={(event) => setDraft({ ...draft, duration: Number(event.target.value) })}
            />
          </Field>
          <Field label="镜头数">
            <input
              type="number"
              min={1}
              max={40}
              value={draft.targetShots}
              onChange={(event) => setDraft({ ...draft, targetShots: Number(event.target.value) })}
            />
          </Field>
          <Field label="受众">
            <input value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} />
          </Field>
          <Field label="风格">
            <input value={draft.style} onChange={(event) => setDraft({ ...draft, style: event.target.value })} />
          </Field>
          <Field label="创意内容" wide>
            <textarea value={draft.idea} onChange={(event) => setDraft({ ...draft, idea: event.target.value })} />
          </Field>
        </FormGrid>
        <button className="primary-button" disabled={!draft.name || !draft.idea} onClick={createProject}>
          <FolderPlus size={16} />
          创建项目
        </button>
      </div>
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">项目库</p>
            <h2>本机保存的创作项目</h2>
          </div>
        </div>
        <div className="list">
          {state.projects.map((project) => (
            <div className="list-row" key={project.id}>
              <button className="list-main" onClick={() => activate(project.id)}>
                <strong>{project.name}</strong>
                <span>{project.idea}</span>
              </button>
              <span className="pill">{project.shots.length} 镜头</span>
              <button className="icon-button danger" onClick={() => remove(project.id)} title="删除">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!state.projects.length && <p className="muted">还没有项目。</p>}
        </div>
      </div>
    </section>
  );
}

function Storyboard({
  project,
  busy,
  generate,
  updateShot,
  updateCharacter,
  addLocalAssets,
  addUrlAsset,
  generateImage,
  assetForms,
  setAssetForms,
}: {
  project: Project;
  busy: string | null;
  generate: () => void;
  updateShot: (project: Project, shotId: string, patch: Partial<Shot>) => void;
  updateCharacter: (project: Project, characterId: string, patch: Partial<Character>) => void;
  addLocalAssets: (project: Project, shot: Shot) => void;
  addUrlAsset: (project: Project, shot: Shot) => void;
  generateImage: (shotId: string) => void;
  assetForms: Record<string, Partial<SceneAsset>>;
  setAssetForms: React.Dispatch<React.SetStateAction<Record<string, Partial<SceneAsset>>>>;
}) {
  return (
    <section className="stack">
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">脚本与分镜</p>
            <h2>生成后可逐镜头修改</h2>
          </div>
          <button className="primary-button" disabled={Boolean(busy)} onClick={generate}>
            <Wand2 size={16} />
            Agent 生成分镜
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">角色一致性</p>
            <h2>角色与声音提示</h2>
          </div>
        </div>
        <div className="character-grid">
          {project.characters.map((character) => (
            <div className="character-card" key={character.id}>
              <input value={character.name} onChange={(event) => updateCharacter(project, character.id, { name: event.target.value })} />
              <input value={character.role} onChange={(event) => updateCharacter(project, character.id, { role: event.target.value })} />
              <textarea
                value={character.visualPrompt}
                onChange={(event) => updateCharacter(project, character.id, { visualPrompt: event.target.value })}
              />
            </div>
          ))}
          {!project.characters.length && <p className="muted">点击生成分镜后会出现角色设定。</p>}
        </div>
      </div>

      <div className="shot-grid">
        {project.shots.map((shot) => {
          const form = assetForms[shot.id] ?? {};
          return (
            <article className="shot-card" key={shot.id}>
              <div className="shot-head">
                <span className="shot-index">{shot.index}</span>
                <input value={shot.title} onChange={(event) => updateShot(project, shot.id, { title: event.target.value })} />
                <span className={`status ${shot.videoStatus}`}>{statusText(shot.videoStatus)}</span>
              </div>
              <FormGrid compact>
                <Field label="场景">
                  <input value={shot.scene} onChange={(event) => updateShot(project, shot.id, { scene: event.target.value })} />
                </Field>
                <Field label="时长">
                  <input
                    type="number"
                    min={1}
                    value={shot.duration}
                    onChange={(event) => updateShot(project, shot.id, { duration: Number(event.target.value) })}
                  />
                </Field>
                <Field label="镜头语言" wide>
                  <input value={shot.camera} onChange={(event) => updateShot(project, shot.id, { camera: event.target.value })} />
                </Field>
                <Field label="视频提示词" wide>
                  <textarea
                    value={shot.videoPrompt}
                    onChange={(event) => updateShot(project, shot.id, { videoPrompt: event.target.value })}
                  />
                </Field>
                <Field label="台词/旁白" wide>
                  <textarea
                    value={[shot.narration, shot.dialogue].filter(Boolean).join("\n")}
                    onChange={(event) => updateShot(project, shot.id, { narration: event.target.value })}
                  />
                </Field>
              </FormGrid>

              <div className="asset-bar">
                <button className="secondary-button" onClick={() => addLocalAssets(project, shot)}>
                  <Upload size={15} />
                  本地素材
                </button>
                <button className="secondary-button" disabled={Boolean(busy)} onClick={() => generateImage(shot.id)}>
                  <Sparkles size={15} />
                  生成首帧
                </button>
                <input
                  placeholder="https://... 或 data URL"
                  value={form.source ?? ""}
                  onChange={(event) =>
                    setAssetForms((forms) => ({ ...forms, [shot.id]: { ...form, source: event.target.value } }))
                  }
                />
                <select
                  value={form.kind ?? "image"}
                  onChange={(event) =>
                    setAssetForms((forms) => ({
                      ...forms,
                      [shot.id]: { ...form, kind: event.target.value as SceneAsset["kind"] },
                    }))
                  }
                >
                  <option value="image">图</option>
                  <option value="video">视频</option>
                  <option value="audio">音频</option>
                </select>
                <select
                  value={form.role ?? "reference_image"}
                  onChange={(event) =>
                    setAssetForms((forms) => ({
                      ...forms,
                      [shot.id]: { ...form, role: event.target.value as SceneAsset["role"] },
                    }))
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <button className="icon-button" onClick={() => addUrlAsset(project, shot)} title="添加在线素材">
                  <Link size={16} />
                </button>
              </div>

              <div className="asset-list">
                {shot.assets.map((asset) => (
                  <span key={asset.id} className="asset-chip" title={asset.source}>
                    {asset.role}: {asset.label}
                    <button
                      onClick={() =>
                        updateShot(project, shot.id, {
                          assets: shot.assets.filter((item) => item.id !== asset.id),
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </article>
          );
        })}
        {!project.shots.length && <div className="panel muted">还没有分镜。点击上方按钮生成。</div>}
      </div>
    </section>
  );
}

function VideoTasks({
  state,
  project,
  createVideo,
  poll,
  download,
  busy,
}: {
  state: AgentStateForRenderer;
  project: Project;
  createVideo: (shotId: string) => void;
  poll: (jobId: string) => void;
  download: (jobId: string) => void;
  busy: string | null;
}) {
  const jobs = state.jobs.filter((job) => job.projectId === project.id);
  return (
    <section className="two-column wide-left">
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">视频生成</p>
            <h2>逐镜头提交，结果可轮询下载</h2>
          </div>
          <span className="pill">New API 视频模型</span>
        </div>
        <div className="shot-task-list">
          {project.shots.map((shot) => (
            <div className="task-row" key={shot.id}>
              <div>
                <strong>
                  {shot.index}. {shot.title}
                </strong>
                <span>{shot.videoPrompt}</span>
              </div>
              <button className="primary-button" disabled={Boolean(busy)} onClick={() => createVideo(shot.id)}>
                <Play size={16} />
                生成
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">任务队列</p>
            <h2>远端任务状态</h2>
          </div>
        </div>
        <div className="list">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} poll={poll} download={download} />
          ))}
          {!jobs.length && <p className="muted">还没有视频任务。</p>}
        </div>
      </div>
    </section>
  );
}

function JobRow({
  job,
  poll,
  download,
}: {
  job: VideoJob;
  poll: (jobId: string) => void;
  download: (jobId: string) => void;
}) {
  return (
    <div className="job-card">
      <div className="job-title">
        <strong>{job.shotTitle}</strong>
        <span className={`status ${job.status}`}>{statusText(job.status)}</span>
      </div>
      <div className="progress">
        <span style={{ width: `${job.progress}%` }} />
      </div>
      <small>New API 视频模型 {job.remoteId ? `· ${job.remoteId}` : ""}</small>
      {job.error && <p className="error-text">{job.error}</p>}
      <div className="row-actions">
        <button className="secondary-button" disabled={!job.remoteId} onClick={() => poll(job.id)}>
          <RefreshCw size={15} />
          刷新
        </button>
        {job.resultUrl && (
          <>
            <button className="secondary-button" onClick={() => download(job.id)}>
              <Download size={15} />
              下载
            </button>
            <button className="icon-button" onClick={() => window.agent.openExternal(job.resultUrl!)} title="打开链接">
              <ExternalLink size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SettingsView({
  settings,
  setSettings,
  save,
  test,
  busy,
}: {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  save: () => void;
  test: (role: NewApiModelRole) => void;
  busy: string | null;
}) {
  const setAnalysis = (patch: Partial<AppSettings["newApi"]["analysis"]>) =>
    setSettings({
      ...settings,
      newApi: { ...settings.newApi, analysis: { ...settings.newApi.analysis, ...patch } },
    });
  const setImage = (patch: Partial<AppSettings["newApi"]["image"]>) =>
    setSettings({
      ...settings,
      newApi: { ...settings.newApi, image: { ...settings.newApi.image, ...patch } },
    });
  const setVideo = (patch: Partial<AppSettings["newApi"]["video"]>) =>
    setSettings({
      ...settings,
      newApi: { ...settings.newApi, video: { ...settings.newApi.video, ...patch } },
    });

  return (
    <section className="stack">
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">API 配置</p>
            <h2>自定义网关、模型和接口参数</h2>
          </div>
          <button className="primary-button" onClick={save} disabled={Boolean(busy)}>
            <Save size={16} />
            保存配置
          </button>
        </div>
      </div>
      <div className="settings-grid">
        <ProviderPanel title="分析模型" doc="https://doc.newapi.pro/api/#_2" onTest={() => test("analysis")}>
          <FormGrid>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.newApi.analysis.enabled}
                onChange={(event) => setAnalysis({ enabled: event.target.checked })}
              />
              启用分析模型
            </label>
            <Field label="Base URL">
              <input
                value={settings.newApi.analysis.baseUrl}
                onChange={(event) => setAnalysis({ baseUrl: event.target.value })}
              />
            </Field>
            <Field label="API Key">
              <input
                type="password"
                placeholder={settings.newApi.analysis.apiKey || "sk-..."}
                onChange={(event) => setAnalysis({ apiKey: event.target.value })}
              />
            </Field>
            <Field label="分析模型">
              <input
                value={settings.newApi.analysis.model}
                onChange={(event) => setAnalysis({ model: event.target.value })}
              />
            </Field>
            <Field label="超时秒数">
              <input
                type="number"
                min={5}
                value={settings.newApi.analysis.timeoutSeconds}
                onChange={(event) => setAnalysis({ timeoutSeconds: Number(event.target.value) })}
              />
            </Field>
          </FormGrid>
        </ProviderPanel>

        <ProviderPanel title="生图模型" doc="https://doc.newapi.pro/api/#_2" onTest={() => test("image")}>
          <FormGrid>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.newApi.image.enabled}
                onChange={(event) => setImage({ enabled: event.target.checked })}
              />
              启用生图模型
            </label>
            <Field label="Base URL">
              <input
                value={settings.newApi.image.baseUrl}
                onChange={(event) => setImage({ baseUrl: event.target.value })}
              />
            </Field>
            <Field label="API Key">
              <input
                type="password"
                placeholder={settings.newApi.image.apiKey || "sk-..."}
                onChange={(event) => setImage({ apiKey: event.target.value })}
              />
            </Field>
            <Field label="生图模型">
              <input
                value={settings.newApi.image.model}
                onChange={(event) => setImage({ model: event.target.value })}
              />
            </Field>
            <Field label="超时秒数">
              <input
                type="number"
                min={5}
                value={settings.newApi.image.timeoutSeconds}
                onChange={(event) => setImage({ timeoutSeconds: Number(event.target.value) })}
              />
            </Field>
            <Field label="基准分辨率" wide>
              <div className="option-grid three">
                {imageResolutionOptions.map((resolution) => (
                  <button
                    type="button"
                    key={resolution}
                    className={`option-button ${settings.newApi.image.resolution === resolution ? "active" : ""}`}
                    onClick={() => setImage({ resolution })}
                  >
                    {resolution}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="图像比例" wide>
              <div className="option-grid ratio-grid">
                {imageAspectRatioOptions.map((aspectRatio) => (
                  <button
                    type="button"
                    key={aspectRatio}
                    className={`option-button ${settings.newApi.image.aspectRatio === aspectRatio ? "active" : ""}`}
                    onClick={() => setImage({ aspectRatio })}
                  >
                    {aspectRatio}
                  </button>
                ))}
              </div>
            </Field>
          </FormGrid>
        </ProviderPanel>

        <ProviderPanel title="视频模型（Seedance 接口格式）" doc="https://seedance.muyuan.do/docs" onTest={() => test("video")}>
          <FormGrid>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.newApi.video.enabled}
                onChange={(event) => setVideo({ enabled: event.target.checked })}
              />
              启用视频模型
            </label>
            <Field label="Base URL">
              <input
                value={settings.newApi.video.baseUrl}
                onChange={(event) => setVideo({ baseUrl: event.target.value })}
              />
            </Field>
            <Field label="API Key">
              <input
                type="password"
                placeholder={settings.newApi.video.apiKey || "video key"}
                onChange={(event) => setVideo({ apiKey: event.target.value })}
              />
            </Field>
            <Field label="视频模型">
              <input
                value={settings.newApi.video.model}
                onChange={(event) => setVideo({ model: event.target.value })}
              />
            </Field>
            <Field label="分辨率">
              <select
                value={settings.newApi.video.resolution}
                onChange={(event) =>
                  setVideo({ resolution: event.target.value as AppSettings["newApi"]["video"]["resolution"] })
                }
              >
                <option>480p</option>
                <option>720p</option>
                <option>1080p</option>
              </select>
            </Field>
            <Field label="画幅">
              <select
                value={settings.newApi.video.ratio}
                onChange={(event) =>
                  setVideo({ ratio: event.target.value as AppSettings["newApi"]["video"]["ratio"] })
                }
              >
                {["21:9", "16:9", "4:3", "1:1", "3:4", "9:16", "adaptive"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="单镜头秒数">
              <input
                type="number"
                min={4}
                max={15}
                value={settings.newApi.video.duration}
                onChange={(event) => setVideo({ duration: Number(event.target.value) })}
              />
            </Field>
            <Field label="超时秒数">
              <input
                type="number"
                min={5}
                value={settings.newApi.video.timeoutSeconds}
                onChange={(event) => setVideo({ timeoutSeconds: Number(event.target.value) })}
              />
            </Field>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.newApi.video.generateAudio}
                onChange={(event) => setVideo({ generateAudio: event.target.checked })}
              />
              生成有声视频
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.newApi.video.watermark}
                onChange={(event) => setVideo({ watermark: event.target.checked })}
              />
              保留水印
            </label>
          </FormGrid>
        </ProviderPanel>
      </div>
    </section>
  );
}

function ProviderPanel({
  title,
  doc,
  onTest,
  children,
}: {
  title: string;
  doc: string;
  onTest: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">New API 模型</p>
          <h2>{title}</h2>
        </div>
        <div className="row-actions">
          <button className="secondary-button" onClick={onTest}>
            <RefreshCw size={15} />
            测试
          </button>
          <button className="icon-button" onClick={() => window.agent.openExternal(doc)} title="打开文档">
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function Logs({ logs }: { logs: PipelineLog[] }) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">运行日志</p>
          <h2>请求、任务与本地操作记录</h2>
        </div>
      </div>
      <div className="log-list">
        {logs.map((log) => (
          <div className={`log-row ${log.level}`} key={log.id}>
            <time>{new Date(log.at).toLocaleString()}</time>
            <strong>{log.message}</strong>
            {log.details !== undefined && <pre>{JSON.stringify(log.details, null, 2)}</pre>}
          </div>
        ))}
        {!logs.length && <p className="muted">暂无日志。</p>}
      </div>
    </section>
  );
}

function EmptyProject({ setView }: { setView: (view: View) => void }) {
  return (
    <section className="panel empty">
      <Bot size={34} />
      <h2>先创建项目</h2>
      <p>创建后可以用 Agent 自动拆分角色、场景、镜头和视频提示词。</p>
      <button className="primary-button" onClick={() => setView("projects")}>
        <FolderPlus size={16} />
        新建项目
      </button>
    </section>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function FormGrid({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return <div className={`form-grid ${compact ? "compact" : ""}`}>{children}</div>;
}

function statusText(status: string) {
  const map: Record<string, string> = {
    idle: "待生成",
    queued: "排队",
    running: "生成中",
    succeeded: "完成",
    failed: "失败",
  };
  return map[status] ?? status;
}

function inferAssetKind(source: string): SceneAsset["kind"] {
  const lower = source.toLowerCase();
  if (/\.(mp4|mov|webm)$/.test(lower)) return "video";
  if (/\.(mp3|wav|m4a)$/.test(lower)) return "audio";
  return "image";
}

function inferAssetRole(source: string): SceneAsset["role"] {
  const kind = inferAssetKind(source);
  if (kind === "video") return "reference_video";
  if (kind === "audio") return "reference_audio";
  return "reference_image";
}

function isAgentState(value: unknown): value is AgentStateForRenderer {
  return Boolean(value && typeof value === "object" && "schemaVersion" in value);
}

export default App;
