import type { NewApiConfig, Project } from "../shared/schema.js";
import { fetchJson } from "./http.js";
import { buildStoryboardPrompt, createLocalStoryboard, parseStoryboardJson, type StoryboardResult } from "./storyboard.js";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export async function generateStoryboardWithNewApi(
  project: Project,
  config: NewApiConfig,
): Promise<StoryboardResult> {
  if (!config.apiKey || !config.baseUrl || !config.chatModel) {
    return createLocalStoryboard(project);
  }

  const response = await fetchJson<ChatCompletionResponse>(config, "/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.chatModel,
      messages: [
        { role: "system", content: "你是一个专业短视频导演和制片 Agent，只输出可解析 JSON。" },
        { role: "user", content: buildStoryboardPrompt(project) },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(response.error ?? "New API 剧本生成失败");
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("New API 没有返回可用内容");
  return parseStoryboardJson(content, project);
}

export async function testNewApiConnection(config: NewApiConfig) {
  if (!config.baseUrl || !config.apiKey) {
    return { ok: false, message: "请先填写 New API Base URL 和 API Key" };
  }
  const result = await fetchJson(config, "/v1/models", { method: "GET" });
  if (result.ok) return { ok: true, message: "New API /v1/models 可访问", status: result.status };
  return { ok: false, message: result.error ?? "New API 连接失败", status: result.status };
}
