# AI Video Agent Desktop

基于 [waooAI/waoowaoo](https://github.com/waooAI/waoowaoo) 完整迁移的 Windows 桌面端 AI 影视生产 Agent。

这个仓库保留原项目的工作台、项目/剧集管理、小说导入、剧本与分镜生成、角色/场景/道具/声音资产库、图片/视频/配音任务、Remotion 编辑能力、多语言界面、模型配置中心和任务进度流。桌面版不要求 Docker、MySQL、Redis 或 MinIO；双击 exe 后会在本机启动内置 Next.js 服务，并使用 SQLite、本地文件存储和进程内任务队列。

## 直接使用

到 GitHub Releases 下载 `AI-Video-Agent-*-Windows-x64.exe`，双击打开即可。

首次启动会自动创建：

- SQLite 数据库：`%APPDATA%\\AIVideoAgent\\data\\ai-video-agent.db`
- 上传/生成文件：`%APPDATA%\\AIVideoAgent\\uploads`
- 启动日志：`%APPDATA%\\AIVideoAgent\\logs\\desktop-next.log`

AI 服务的 API Key 可以在应用内设置中心配置。

## 从源码运行

```bash
npm install
npm run desktop:doctor
npm run desktop:setup
npm run desktop
```

`desktop:setup` 会生成桌面本地 `.env`、推送 SQLite 表结构并准备本地存储目录。

## 构建 exe

```bash
npm run build:desktop
```

构建产物会输出到 `release/`，文件名类似：

```text
AI-Video-Agent-0.6.0-Windows-x64.exe
```

## 验证

常用检查：

```bash
npm run typecheck
npm run test:unit:all
npm run build
```

桌面端 smoke test：

```bash
npm run desktop:setup
npm run desktop
```

## 发布

推送 `v*` 标签会触发 `.github/workflows/release.yml`，在 Windows runner 上构建桌面 exe 并上传到 GitHub Release。

```bash
git tag -a v0.6.0 -m "release: v0.6.0 desktop agent"
git push origin main
git push origin v0.6.0
```

## 来源

迁移来源：`waooAI/waoowaoo` main 快照 `34971db`。目标仓库：`silly971/ai-video-agent`。
