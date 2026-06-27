# API 接入说明

## Provider 设计

应用内置两个 Provider：

- `newapi`：OpenAI 兼容网关，负责剧本/分镜生成，也可调用 OpenAI 风格视频接口。
- `seedance`：Seedance 视频生成网关，负责高质量视频异步任务。

两个 Provider 都支持：

- 自定义 `baseUrl`
- 自定义 `apiKey`
- 自定义模型名
- 自定义请求头 JSON
- 连接测试
- 错误信息回传到运行日志

## Seedance 请求格式

文生视频：

```json
{
  "model": "doubao-seedance-2-0-fast-260128",
  "prompt": "镜头平稳推进，人物自然移动",
  "resolution": "720p",
  "ratio": "9:16",
  "duration": 5,
  "generate_audio": true,
  "watermark": false
}
```

参考素材：

```json
{
  "content": [
    {
      "type": "image_url",
      "role": "first_frame",
      "image_url": { "url": "https://example.com/start.png" }
    }
  ]
}
```

## New API 视频请求格式

New API 视频接口使用 `multipart/form-data`：

- `prompt`
- `model`
- `seconds`
- `size`
- `metadata`
- `input_reference`（本地参考图时使用）

## 任务状态归一化

应用把远端状态统一为：

- `queued`
- `running`
- `succeeded`
- `failed`

这样工作台可以同时显示不同服务商的任务状态。
