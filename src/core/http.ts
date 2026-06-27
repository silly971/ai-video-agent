import type { ProviderConfig } from "../shared/schema.js";

export interface RequestResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export function joinUrl(baseUrl: string, endpoint: string) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
}

export function parseHeadersJson(headersJson: string) {
  if (!headersJson.trim()) return {};
  const value = JSON.parse(headersJson);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("自定义请求头必须是 JSON 对象");
  }
  return Object.fromEntries(Object.entries(value).map(([key, headerValue]) => [key, String(headerValue)]));
}

export async function fetchJson<T>(
  config: ProviderConfig,
  endpoint: string,
  init: RequestInit = {},
): Promise<RequestResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(5, config.timeoutSeconds) * 1000);
  try {
    const headers = {
      Authorization: config.apiKey ? `Bearer ${config.apiKey}` : "",
      ...parseHeadersJson(config.headersJson),
      ...(init.headers ?? {}),
    };
    const response = await fetch(joinUrl(config.baseUrl, endpoint), {
      ...init,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    let data: unknown = undefined;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: extractError(data) ?? response.statusText,
        data: data as T,
      };
    }
    return { ok: true, status: response.status, data: data as T };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function extractError(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return typeof data === "string" ? data : undefined;
  const record = data as Record<string, unknown>;
  const error = record.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const errorRecord = error as Record<string, unknown>;
    if (typeof errorRecord.message === "string") return errorRecord.message;
    if (typeof errorRecord.type === "string") return errorRecord.type;
  }
  if (typeof record.message === "string") return record.message;
  return undefined;
}
