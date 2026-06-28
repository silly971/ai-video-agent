# AI Video Agent Native

基于 [waooAI/waoowaoo](https://github.com/waooAI/waoowaoo) 迁移的 Windows 原生桌面端 AI 影视生产 Agent。

`v0.7.0` 开始，正式桌面入口改为 WinForms 原生 UI：不启动 Next.js，不嵌入浏览器控件，不依赖 Electron/WebView。应用直接读取本地项目文件夹，按视频、图片、音频、文案和数据文件建立素材清单，并生成可导出的镜头提示词草稿。

## 直接使用

到 GitHub Releases 下载 `AI-Video-Agent-Native-*-Windows-x64.exe`，双击打开即可。

使用流程：

1. 点击“打开文件夹”，选择本地视频项目目录。
2. 在“素材”页检查递归读取到的文件。
3. 在“剧本/文案”页确认或粘贴文本。
4. 点击“生成镜头草稿”。
5. 点击“导出提示词包”或“保存清单”。

导出文件会写入所选项目目录下的 `_native_agent/`：

- `project.manifest.json`
- `storyboard_prompts.csv`
- `video_agent_prompt_pack.txt`

## 从源码运行

```bash
npm install
npm run desktop
```

`npm run desktop` 会构建并启动原生桌面程序。旧的 Electron/Next 运行方式保留为 `npm run desktop:web-legacy`，仅用于历史对照。

## 构建 exe

```bash
npm run build:native
```

构建产物会输出到 `release/`，文件名类似：

```text
AI-Video-Agent-Native-0.7.0-Windows-x64.exe
```

## 验证

常用检查：

```bash
npm run build:native
```

`build:native` 会编译 WinForms 程序、打包 zip，并启动 exe 做一次 smoke test。

## 发布

推送 `v*` 标签会触发 `.github/workflows/release.yml`，在 Windows runner 上构建原生桌面 exe/zip 并上传到 GitHub Release。

```bash
git tag -a v0.7.0 -m "release: v0.7.0 native desktop agent"
git push origin main
git push origin v0.7.0
```

## 来源

迁移来源：`waooAI/waoowaoo` main 快照 `34971db`。目标仓库：`silly971/ai-video-agent`。
