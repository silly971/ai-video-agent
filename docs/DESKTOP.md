# AI Video Agent Desktop

桌面版把 `waooAI/waoowaoo` 的完整 Next.js 工作台包装为 Windows Electron 应用。

运行方式：

- 数据库：SQLite
- 存储：本地文件目录
- 任务队列：Next.js 进程内执行器
- 实时进度：进程内事件总线 + SSE
- 后台依赖：无需 Docker、MySQL、Redis、MinIO

## 源码调试

```bash
npm install
npm run desktop:doctor
npm run desktop:setup
npm run desktop
```

## 打包

```bash
npm run build:desktop
```

输出目录：`release/`

## 数据目录

打包 exe 默认使用 `%APPDATA%\\AIVideoAgent`：

- `data/ai-video-agent.db`
- `uploads/`
- `logs/desktop-next.log`
- `desktop-secrets.json`

## Release

推送 `v*` tag 后，GitHub Actions 会在 Windows runner 构建并上传 portable exe。
