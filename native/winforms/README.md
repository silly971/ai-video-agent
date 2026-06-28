# AI Video Agent Native

这是 `AI Video Agent` 的 Windows 原生桌面端入口。

- UI: WinForms 原生窗口和控件
- 文件: 直接递归读取本地项目文件夹
- 输出: `_native_agent/project.manifest.json`、`storyboard_prompts.csv`、`video_agent_prompt_pack.txt`
- 运行: 不启动 Next.js、不嵌入浏览器控件、不依赖 Electron/WebView

## 使用方式

双击 `AI-Video-Agent-Native-*-Windows-x64.exe`，点击“打开文件夹”，选择一个包含视频、图片、音频、文案或数据文件的项目目录。

常用流程：

1. 在“素材”页检查导入文件。
2. 在“剧本/文案”页确认或粘贴文本。
3. 点击“生成镜头草稿”。
4. 点击“导出提示词包”或“保存清单”。

导出文件会写入所选项目目录下的 `_native_agent` 文件夹。

## 从源码构建

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-native-desktop.ps1 -RunSmokeTest
```

构建产物位于 `release/`。
