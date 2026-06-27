# Changelog

## 0.1.2 - 2026-06-27

- 将接口配置改为 New API 分析模型、生图模型、视频模型三套独立配置。
- 将 Seedance 调用方式合并到 New API 视频模型，不再展示独立 Seedance Provider。
- 增加按镜头生成首帧图功能，生成结果会作为视频参考素材写回分镜。
- 增加旧版 `newApi` / `seedance` 配置迁移逻辑和迁移测试。

## 0.1.1 - 2026-06-27

- 修复 Electron `file://` 下 Vite 资源路径导致的空白窗口。
- 修复 Electron preload 以 ESM 输出导致 `window.agent` 未注入的问题。
- 重新验证生产模式启动和 Windows 便携包启动。

## 0.1.0 - 2026-06-27

- 初始化 Electron + React 桌面端。
- 增加 New API 分镜生成和视频接口接入。
- 增加 Seedance 视频任务提交、轮询与下载。
- 增加项目、角色、分镜、素材、任务和日志工作台。
- 增加本机状态保存、导入导出、接口连接测试。
