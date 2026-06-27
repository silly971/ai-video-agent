# AI Video Agent

桌面端 AI 视频制作 Agent，参考了 Shortify-AI、ai-fusion-video、waoowaoo 的工作流优点：创意到剧本拆解、角色一致性、分镜管理、多模型接口配置、视频异步任务和本地日志。

## 核心能力

- 项目工作台：创建视频项目，设置受众、风格、画幅、目标镜头数和总时长。
- 内置三套工作流：Shortify 线性短剧闭环、Fusion Agent 可控分镜平台、waoowaoo GraphRun 工业工作台；项目创建时可选择，Agent 会使用对应阶段、队列和提示词策略。
- Agent 分镜：使用 New API 分析模型生成角色、场景、分镜、图片提示词和视频提示词；无 Key 时提供本地结构化草稿。
- 提示词工作台：分镜中可编辑首帧图提示词、视频提示词、配音提示词、连续性提示、任务标签和生产备注。
- 角色与素材：可编辑角色视觉描述、配音提示、每个镜头的图/视频/音频参考素材，并可用 New API 生图模型按指定分辨率和图像比例生成首帧素材。
- 视频生成：使用 New API 视频模型提交 `/v1/videos` JSON 任务，视频请求体采用 Seedance 文档中的 `content[]` 参考素材格式。
- 任务轮询：保存远端任务 ID、状态、进度、结果 URL、原始响应和错误信息。
- 自定义接口：分析模型、生图模型、视频模型分别配置 Base URL、API Key、模型名和超时参数；请求头由应用内置处理。
- 本地保存：项目、配置、日志保存在 Electron userData 目录，API Key 使用系统安全存储加密。

## 内置工作流

| 工作流 | 来源 | 内置策略 |
|---|---|---|
| Shortify 线性短剧闭环 | ycbing/Shortify-AI | 创意、结构化短剧、分镜首帧、配音、镜头视频、合成导出 |
| Fusion Agent 可控分镜平台 | Stonewuu/ai-fusion-video | 项目上下文、剧本 Agent、分镜 Agent、资产图片队列、分镜视频队列、剧集合成 |
| waoowaoo GraphRun 工业工作台 | waooAI/waoowaoo | 故事输入、剧本、资产、提示词、分镜、配音、视频、GraphRun 追踪 |

## 接口支持

### New API 模型配置

- 分析模型：`POST /v1/chat/completions`
- 生图模型：`POST /v1/images/generations`，请求体会带 `resolution`、`aspect_ratio` 和派生 `size`
- 视频模型：`POST /v1/videos`
- 视频查询：`GET /v1/videos/{video_id}`
- Auth: `Authorization: Bearer <API_KEY>`
- 文档：[New API 接口文档](https://doc.newapi.pro/api/#_2)

### 视频模型请求体

Seedance 不再作为独立 Provider 展示；它的接口方式合并为 New API 视频模型的请求格式：

- Text to video: `POST /v1/videos`
- Image/video/audio reference: `content[]` with `image_url` / `video_url` / `audio_url`
- Query: `GET /v1/videos/{id}`
- 参考文档：[Seedance docs](https://seedance.muyuan.do/docs)

## 开发运行

```bash
npm install
npm run dev
```

## 本地验证

```bash
npm run typecheck
npm test
npm run build
```

## 构建与启动

```bash
npm run build
npm run start
```

`npm run start` 会先构建，再用 Electron 打开桌面应用。后续如果需要安装器，可在 CI 或打包机上接入 electron-builder / forge。

## 参考项目

- [ycbing/Shortify-AI](https://github.com/ycbing/Shortify-AI)
- [Stonewuu/ai-fusion-video](https://github.com/Stonewuu/ai-fusion-video)
- [waooAI/waoowaoo](https://github.com/waooAI/waoowaoo)
