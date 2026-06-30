import { buildOpenAIChatCompletion } from '@/lib/llm/providers/openai-compat'
import { buildReasoningAwareContent } from '@/lib/llm/utils'
import type { InternalLLMStreamStepMeta } from '@/lib/llm-observe/internal-stream-context'
import type { ChatCompletionStreamCallbacks } from '@/lib/llm/types'
import { emitStreamChunk, emitStreamStage } from '@/lib/llm/stream-helpers'
import type { OpenAICompatChatRequest } from '../types'
import { resolveOpenAICompatClientConfig } from './common'

type ResponsesUsage = {
  promptTokens: number
  completionTokens: number
}

type ErrorWithStatus = Error & { status?: number }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function toEndpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function collectText(node: unknown, acc: string[]) {
  if (typeof node === 'string') {
    acc.push(node)
    return
  }
  if (Array.isArray(node)) {
    node.forEach((item) => collectText(item, acc))
    return
  }
  const record = asRecord(node)
  if (!record) return

  const type = typeof record.type === 'string' ? record.type : ''
  if (type.includes('reasoning')) return
  if (typeof record.output_text === 'string') acc.push(record.output_text)
  if (typeof record.text === 'string') acc.push(record.text)
  if (typeof record.content === 'string') acc.push(record.content)
  if (record.content !== undefined && typeof record.content !== 'string') collectText(record.content, acc)
  if (record.output !== undefined) collectText(record.output, acc)
}

function collectReasoning(node: unknown, acc: string[]) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectReasoning(item, acc))
    return
  }
  const record = asRecord(node)
  if (!record) return

  const type = typeof record.type === 'string' ? record.type : ''
  if (type.includes('reasoning')) {
    if (typeof record.text === 'string') acc.push(record.text)
    if (typeof record.content === 'string') acc.push(record.content)
    if (record.content !== undefined && typeof record.content !== 'string') {
      collectReasoning(record.content, acc)
    }
  }

  if (record.reasoning !== undefined) collectReasoning(record.reasoning, acc)
  if (record.reasoning_content !== undefined) collectReasoning(record.reasoning_content, acc)
  if (record.output !== undefined) collectReasoning(record.output, acc)
}

function extractResponsesText(payload: unknown): string {
  const root = asRecord(payload)
  if (!root) return ''
  if (typeof root.output_text === 'string') return root.output_text

  const parts: string[] = []
  collectText(root.output ?? root, parts)
  return parts.join('')
}

function extractResponsesReasoning(payload: unknown): string {
  const root = asRecord(payload)
  if (!root) return ''

  const parts: string[] = []
  collectReasoning(root.output ?? root, parts)
  return parts.join('')
}

function extractResponsesUsage(payload: unknown): ResponsesUsage {
  const usage = asRecord(asRecord(payload)?.usage) || {}
  const promptTokens = typeof usage.input_tokens === 'number'
    ? usage.input_tokens
    : (typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0)
  const completionTokens = typeof usage.output_tokens === 'number'
    ? usage.output_tokens
    : (typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0)
  return {
    promptTokens,
    completionTokens,
  }
}

function buildResponsesBody(input: OpenAICompatChatRequest, stream?: boolean) {
  return {
    model: input.modelId,
    input: input.messages.map((message) => ({
      role: message.role,
      content: [{ type: 'input_text', text: message.content }],
    })),
    temperature: input.temperature,
    ...(stream ? { stream: true } : {}),
  }
}

export async function runOpenAICompatResponsesCompletion(input: OpenAICompatChatRequest) {
  const config = await resolveOpenAICompatClientConfig(input.userId, input.providerId)
  const endpoint = toEndpoint(config.baseUrl, '/responses')
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(buildResponsesBody(input)),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    const error = new Error(
      `OPENAI_COMPAT_RESPONSES_FAILED: ${response.status} ${errorBody.slice(0, 300)}`,
    ) as ErrorWithStatus
    error.status = response.status
    throw error
  }

  const payload = await response.json() as unknown
  const text = extractResponsesText(payload)
  const reasoning = extractResponsesReasoning(payload)
  const usage = extractResponsesUsage(payload)

  return buildOpenAIChatCompletion(
    input.modelId,
    buildReasoningAwareContent(text, reasoning),
    usage,
  )
}

function parseSseDataBlock(block: string): unknown | null {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s?/, ''))
    .join('\n')
    .trim()
  if (!data || data === '[DONE]') return null
  try {
    return JSON.parse(data) as unknown
  } catch {
    return null
  }
}

function stringifyStreamError(event: Record<string, unknown>): string {
  const error = asRecord(event.error) || asRecord(asRecord(event.response)?.error)
  if (!error) return ''
  const message = typeof error.message === 'string' ? error.message : ''
  const code = typeof error.code === 'string' ? error.code : ''
  return [code, message].filter(Boolean).join(': ')
}

export async function runOpenAICompatResponsesStream(
  input: OpenAICompatChatRequest,
  callbacks?: ChatCompletionStreamCallbacks,
  stepMeta?: InternalLLMStreamStepMeta,
) {
  const config = await resolveOpenAICompatClientConfig(input.userId, input.providerId)
  const endpoint = toEndpoint(config.baseUrl, '/responses')
  emitStreamStage(callbacks, stepMeta, 'streaming', 'openai-compat')
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(buildResponsesBody(input, true)),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    const error = new Error(
      `OPENAI_COMPAT_RESPONSES_STREAM_FAILED: ${response.status} ${errorBody.slice(0, 300)}`,
    ) as ErrorWithStatus
    error.status = response.status
    throw error
  }

  if (!response.body) {
    throw new Error('OPENAI_COMPAT_RESPONSES_STREAM_FAILED: response body is empty')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let reasoning = ''
  let seq = 1
  let finalPayload: unknown = null

  const emitDelta = (kind: 'text' | 'reasoning', delta: string) => {
    if (!delta) return
    emitStreamChunk(callbacks, stepMeta, {
      kind,
      delta,
      seq,
      lane: kind === 'reasoning' ? 'reasoning' : 'main',
    })
    seq += 1
  }

  const handleEvent = (eventPayload: unknown) => {
    const event = asRecord(eventPayload)
    if (!event) return
    const type = typeof event.type === 'string' ? event.type : ''
    const delta = typeof event.delta === 'string' ? event.delta : ''

    if (type === 'response.output_text.delta') {
      text += delta
      emitDelta('text', delta)
      return
    }

    if (
      type === 'response.reasoning_text.delta' ||
      type === 'response.reasoning_summary_text.delta'
    ) {
      reasoning += delta
      emitDelta('reasoning', delta)
      return
    }

    if (type === 'response.completed') {
      finalPayload = event.response ?? event
      return
    }

    if (type === 'response.failed' || type === 'response.error') {
      const detail = stringifyStreamError(event)
      throw new Error(`OPENAI_COMPAT_RESPONSES_STREAM_FAILED${detail ? `: ${detail}` : ''}`)
    }
  }

  const flushBuffer = () => {
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() || ''
    for (const block of blocks) {
      handleEvent(parseSseDataBlock(block))
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    flushBuffer()
  }
  buffer += decoder.decode()
  if (buffer.trim()) {
    handleEvent(parseSseDataBlock(buffer))
    buffer = ''
  }

  if (finalPayload) {
    const finalText = extractResponsesText(finalPayload)
    const finalReasoning = extractResponsesReasoning(finalPayload)
    if (finalReasoning && finalReasoning !== reasoning) {
      const delta = finalReasoning.startsWith(reasoning)
        ? finalReasoning.slice(reasoning.length)
        : finalReasoning
      reasoning = finalReasoning
      emitDelta('reasoning', delta)
    }
    if (finalText && finalText !== text) {
      const delta = finalText.startsWith(text)
        ? finalText.slice(text.length)
        : finalText
      text = finalText
      emitDelta('text', delta)
    }
  }

  return buildOpenAIChatCompletion(
    input.modelId,
    buildReasoningAwareContent(text, reasoning),
    extractResponsesUsage(finalPayload),
  )
}
