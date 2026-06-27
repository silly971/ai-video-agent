export type WorkflowId = "shortify-linear" | "fusion-agent" | "waoowaoo-graph";
export type WorkflowQueue = "text" | "image" | "voice" | "video" | "compose" | "ops";
export type WorkflowStageStatus = "pending" | "ready" | "running" | "done" | "failed";

export interface WorkflowStageDefinition {
  id: string;
  title: string;
  queue: WorkflowQueue;
  agent: string;
  objective: string;
  output: string;
  promptFocus: string;
}

export interface WorkflowRunStage extends WorkflowStageDefinition {
  status: WorkflowStageStatus;
}

export interface WorkflowRun {
  workflowId: WorkflowId;
  generatedAt?: string;
  stages: WorkflowRunStage[];
  checkpoints: string[];
}

export interface WorkflowDefinition {
  id: WorkflowId;
  name: string;
  shortName: string;
  sourceProject: string;
  mode: string;
  positioning: string;
  bestFor: string;
  creationHint: string;
  systemPrompt: string;
  operatorPrompt: string;
  outputContract: string;
  promptRules: string[];
  fallbackBeats: string[];
  stages: WorkflowStageDefinition[];
}

export const DEFAULT_WORKFLOW_ID: WorkflowId = "shortify-linear";

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    id: "shortify-linear",
    name: "Shortify 线性短剧闭环",
    shortName: "一键短剧",
    sourceProject: "ycbing/Shortify-AI",
    mode: "创意 -> 剧本 -> 分镜图 -> 配音 -> 视频 -> 合成",
    positioning: "把一句创意压缩成可连续生产的短剧项目，适合快速 Demo 和个人创作。",
    bestFor: "快速生成短剧、低部署成本、小团队验证。",
    creationHint: "优先生成结构清楚、可直接进入生图/配音/视频任务的 Shot 列表。",
    systemPrompt:
      "你是 Shortify-AI 风格的短剧导演 Agent，擅长把创意转换为线性短剧生产链路。你必须保持角色一致性，并把每个镜头写成可直接交给图片、配音、视频模型执行的任务。",
    operatorPrompt:
      "按 Shortify-AI 的线性闭环工作：先完成结构化短剧，再写角色设定、镜头数组、首帧图提示词、配音提示、视频提示词和合成备注。不要输出平台配置或数据库说明。",
    outputContract:
      "输出 characters 与 shots。shots 要能按顺序执行，每个镜头都包含 imagePrompt、videoPrompt、voicePrompt、duration、camera、productionNotes 和 taskTags。",
    promptRules: [
      "镜头顺序必须形成开场钩子、冲突推进、转折、结尾记忆点。",
      "角色 visualPrompt 必须可复用，镜头提示词要复述关键外观，保证角色一致。",
      "没有 AI 视频素材时，视频提示词也要能支持图片加 Ken Burns 动效兜底。",
      "每个镜头 4-8 秒，适合 FFmpeg 后续拼接字幕、BGM 和配音。",
    ],
    fallbackBeats: ["开场钩子", "角色登场", "冲突出现", "选择升级", "情绪爆发", "结尾反转"],
    stages: [
      {
        id: "script",
        title: "结构化短剧",
        queue: "text",
        agent: "AI 编剧",
        objective: "从创意生成角色、剧集节奏和镜头数组。",
        output: "characters / shots",
        promptFocus: "主题、类型、风格、集数、镜头数。",
      },
      {
        id: "storyboard-image",
        title: "分镜首帧",
        queue: "image",
        agent: "分镜图片 Agent",
        objective: "为每个镜头生成角色一致的首帧图或参考图。",
        output: "imagePrompt / first_frame",
        promptFocus: "角色外观、场景、构图、画幅。",
      },
      {
        id: "voiceover",
        title: "多角色配音",
        queue: "voice",
        agent: "配音 Agent",
        objective: "根据旁白和对白生成可对齐时长的音频提示。",
        output: "voicePrompt / duration",
        promptFocus: "角色声音、情绪、语速。",
      },
      {
        id: "shot-video",
        title: "镜头视频",
        queue: "video",
        agent: "视频生成 Agent",
        objective: "用首帧图、提示词和参考素材生成镜头视频。",
        output: "videoPrompt / video task",
        promptFocus: "主体动作、镜头运动、光线、时长。",
      },
      {
        id: "compose",
        title: "合成导出",
        queue: "compose",
        agent: "FFmpeg 合成器",
        objective: "拼接镜头、字幕、配音、BGM，导出成片。",
        output: "episode video / final video",
        promptFocus: "字幕、BGM、转场、兜底策略。",
      },
    ],
  },
  {
    id: "fusion-agent",
    name: "Fusion Agent 可控分镜平台",
    shortName: "Agent 分镜",
    sourceProject: "Stonewuu/ai-fusion-video",
    mode: "项目管理 + Agent Pipeline + Redis 队列式生成",
    positioning: "围绕项目、剧本、资产和分镜项组织生产，强调 Agent 读写上下文和可控分镜。",
    bestFor: "平台化视频创作、企业内部工具、需要多模型与资产边界的项目。",
    creationHint: "优先生成可被 Agent Pipeline 消费的分镜项、资产依赖和队列标签。",
    systemPrompt:
      "你是 ai-fusion-video 风格的 Agent Pipeline 编排器。你要像项目后台一样工作：先理解项目和剧本上下文，再拆分场景、资产、分镜项、图片任务和视频任务。",
    operatorPrompt:
      "按 Agent Pipeline 工作：完整剧本解析、故事转剧本、剧本转分镜、资产预处理、分镜帧生成、分镜视频生成。每个镜头要写清楚可读写的业务字段和后续工具调用意图。",
    outputContract:
      "输出 characters 与 shots。shots 应体现 storyboard item 思维，必须包含 scene、characters、camera、imagePrompt、videoPrompt、productionNotes、taskTags，并尽量写出资产依赖。",
    promptRules: [
      "每个镜头都是可控分镜项，不只是一句画面描述。",
      "taskTags 要标记 script_to_storyboard、asset_image_gen、storyboard_video_gen 等执行意图。",
      "提示词要利于多模型路由，避免绑定某个单一模型私有参数。",
      "保留项目、剧本、资产、分镜之间的边界，便于后续人工编辑。",
    ],
    fallbackBeats: ["项目设定", "场景建立", "资产入场", "核心动作", "分镜推进", "视频合成点"],
    stages: [
      {
        id: "project-context",
        title: "项目上下文",
        queue: "text",
        agent: "默认媒体助手",
        objective: "整理项目目标、受众、风格、画幅和生产约束。",
        output: "project context",
        promptFocus: "项目目标、目标观众、风格、模型配置。",
      },
      {
        id: "script-agent",
        title: "剧本 Agent",
        queue: "text",
        agent: "故事转剧本 Agent",
        objective: "把创意改写成可按场景管理的剧本。",
        output: "episodes / scenes",
        promptFocus: "剧集、场景、冲突和对白。",
      },
      {
        id: "storyboard-agent",
        title: "分镜 Agent",
        queue: "text",
        agent: "剧本转分镜 Agent",
        objective: "把剧本场景转换为可控分镜项。",
        output: "storyboard items",
        promptFocus: "景别、镜头运动、角度、焦距、转场。",
      },
      {
        id: "asset-image-gen",
        title: "资产图片队列",
        queue: "image",
        agent: "资产图片生成 Agent",
        objective: "生成或更新角色、场景、道具和首帧资产。",
        output: "asset items / image tasks",
        promptFocus: "角色 ID、场景资产、道具、视觉一致性。",
      },
      {
        id: "storyboard-video-gen",
        title: "分镜视频队列",
        queue: "video",
        agent: "分镜视频生成 Agent",
        objective: "按分镜项提交视频任务并写回生成结果。",
        output: "video tasks / storyboard video",
        promptFocus: "模型路由、时长、参考素材、动作。",
      },
      {
        id: "episode-compose",
        title: "剧集合成",
        queue: "compose",
        agent: "VideoComposeService",
        objective: "收集分镜项视频并合成为剧集视频。",
        output: "episode video",
        promptFocus: "FFmpeg concat、顺序、转场、媒体存储。",
      },
    ],
  },
  {
    id: "waoowaoo-graph",
    name: "waoowaoo GraphRun 工业工作台",
    shortName: "GraphRun 生产",
    sourceProject: "waooAI/waoowaoo",
    mode: "分阶段工作台 + BullMQ Worker + GraphRun 可恢复长流程",
    positioning: "把影视生产拆成小说/故事、剧本、资产、提示词、分镜、配音、视频和可恢复任务图。",
    bestFor: "复杂影视生产、长剧本、多资产、多阶段重试和资产沉淀。",
    creationHint: "优先生成带阶段、队列、检查点和重试语义的生产任务图。",
    systemPrompt:
      "你是 waoowaoo 风格的工业级 AI 影视 Studio 编排 Agent。你必须用工作台阶段和 GraphRun 思维拆解任务，关注资产复用、长流程恢复、重试和产物记录。",
    operatorPrompt:
      "按 Novel Input、Script、Assets、Prompts、Storyboard、Voice、Video 阶段工作。每个镜头都要说明所属队列、依赖资产、可重试点、检查点和后续 Worker 处理方式。",
    outputContract:
      "输出 characters 与 shots。shots 要包含 imagePrompt、videoPrompt、voicePrompt、continuityPrompt、productionNotes、taskTags；taskTags 要体现 text/image/voice/video 队列和 GraphRun step。",
    promptRules: [
      "从长流程角度规划，不要只写一个最终视频提示词。",
      "提示词要保留角色、场景、声音和媒体对象的可复用信息。",
      "productionNotes 要写清楚检查点、失败后重试位置和人工可编辑内容。",
      "每个镜头都要区分 text、image、voice、video 队列任务。",
    ],
    fallbackBeats: ["故事输入", "剧本转换", "资产设计", "提示词细化", "分镜格", "配音", "视频生成", "检查点"],
    stages: [
      {
        id: "novel-input",
        title: "故事输入",
        queue: "text",
        agent: "Novel Input",
        objective: "吸收小说、故事或创意，确定主题、人物和推广目标。",
        output: "source brief",
        promptFocus: "原始故事、人物关系、核心卖点。",
      },
      {
        id: "script",
        title: "剧本阶段",
        queue: "text",
        agent: "Script Worker",
        objective: "生成或编辑可分集、可分镜的剧本。",
        output: "script / episodes",
        promptFocus: "剧本转换、分集、对白、旁白。",
      },
      {
        id: "assets",
        title: "资产阶段",
        queue: "image",
        agent: "Asset Hub",
        objective: "沉淀角色、场景、声音和媒体对象。",
        output: "characters / locations / voices / media",
        promptFocus: "全局资产、项目资产、角色档案。",
      },
      {
        id: "prompts",
        title: "提示词阶段",
        queue: "text",
        agent: "Prompt Worker",
        objective: "维护镜头描述、角色一致性、视频和声音提示词。",
        output: "shot prompts",
        promptFocus: "镜头提示词、变体分析、连续性。",
      },
      {
        id: "storyboard",
        title: "分镜阶段",
        queue: "image",
        agent: "Storyboard Worker",
        objective: "生成分镜格和图像变体。",
        output: "panels / storyboard",
        promptFocus: "分镜格、首帧、图片变体。",
      },
      {
        id: "voice",
        title: "配音阶段",
        queue: "voice",
        agent: "Voice Worker",
        objective: "分析声音并生成台词配音。",
        output: "voice lines",
        promptFocus: "声音设计、语速、情绪、口型同步准备。",
      },
      {
        id: "video",
        title: "视频阶段",
        queue: "video",
        agent: "Video Worker",
        objective: "生成分镜视频、口型同步和可预览片段。",
        output: "video clips",
        promptFocus: "视频生成、口型同步、媒体对象。",
      },
      {
        id: "graphrun",
        title: "GraphRun 追踪",
        queue: "ops",
        agent: "GraphRun Runtime",
        objective: "记录步骤、尝试、事件、检查点、产物和失败回滚。",
        output: "GraphRun / checkpoints / artifacts",
        promptFocus: "可恢复、可重试、事件流、计费回滚。",
      },
    ],
  },
];

export function isWorkflowId(value: unknown): value is WorkflowId {
  return WORKFLOW_DEFINITIONS.some((workflow) => workflow.id === value);
}

export function getWorkflowDefinition(workflowId: unknown): WorkflowDefinition {
  return WORKFLOW_DEFINITIONS.find((workflow) => workflow.id === workflowId) ?? WORKFLOW_DEFINITIONS[0];
}

export function createWorkflowRun(
  workflowId: unknown,
  options: { planned?: boolean; imageCount?: number; videoCount?: number; failed?: boolean } = {},
): WorkflowRun {
  const workflow = getWorkflowDefinition(workflowId);
  const imageCount = options.imageCount ?? 0;
  const videoCount = options.videoCount ?? 0;
  return {
    workflowId: workflow.id,
    generatedAt: options.planned ? new Date().toISOString() : undefined,
    stages: workflow.stages.map((stage, index) => ({
      ...stage,
      status: statusForStage(stage, index, {
        planned: Boolean(options.planned),
        imageCount,
        videoCount,
        failed: Boolean(options.failed),
      }),
    })),
    checkpoints: buildCheckpoints(workflow, Boolean(options.planned), imageCount, videoCount),
  };
}

export function workflowOptionLabel(workflowId: unknown) {
  const workflow = getWorkflowDefinition(workflowId);
  return `${workflow.shortName} · ${workflow.sourceProject}`;
}

function statusForStage(
  stage: WorkflowStageDefinition,
  index: number,
  options: { planned: boolean; imageCount: number; videoCount: number; failed: boolean },
): WorkflowStageStatus {
  if (options.failed && index === 0) return "failed";
  if (!options.planned) return index === 0 ? "ready" : "pending";
  if (stage.queue === "text") return "done";
  if (stage.queue === "image") return options.imageCount > 0 ? "done" : "ready";
  if (stage.queue === "video") return options.videoCount > 0 ? "done" : "ready";
  if (stage.queue === "voice") return "ready";
  if (stage.queue === "compose") return options.videoCount > 0 ? "ready" : "pending";
  return "ready";
}

function buildCheckpoints(workflow: WorkflowDefinition, planned: boolean, imageCount: number, videoCount: number) {
  if (!planned) {
    return [`等待执行 ${workflow.shortName} 工作流首个文本规划阶段`];
  }
  const checkpoints = [`${workflow.shortName} 已生成角色、镜头和提示词骨架`];
  if (imageCount > 0) checkpoints.push(`已沉淀 ${imageCount} 个图像/首帧素材`);
  if (videoCount > 0) checkpoints.push(`已创建或完成 ${videoCount} 个视频任务`);
  checkpoints.push("后续阶段可逐镜头重试，日志会保留任务事件");
  return checkpoints;
}
