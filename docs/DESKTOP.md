# AI Video Agent Native Desktop

桌面版从 `v0.7.0` 起切换为 Windows 原生 WinForms 应用。

运行方式：

- UI：WinForms 原生窗口和控件
- 输入：直接读取本地项目文件夹
- 输出：`_native_agent/project.manifest.json`、`storyboard_prompts.csv`、`video_agent_prompt_pack.txt`
- 后台依赖：无需 Docker、MySQL、Redis、MinIO、Next.js、Electron 或 WebView

## 源码调试

```bash
npm install
npm run desktop
```

## 打包

```bash
npm run build:native
```

输出目录：`release/`

## 项目输出目录

导出的清单和提示词包默认写入用户选择的项目目录：

- `_native_agent/project.manifest.json`
- `_native_agent/storyboard_prompts.csv`
- `_native_agent/video_agent_prompt_pack.txt`

## Release

推送 `v*` tag 后，GitHub Actions 会在 Windows runner 构建并上传 native exe 和 zip。
