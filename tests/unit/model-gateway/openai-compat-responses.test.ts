import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveOpenAICompatClientConfigMock = vi.hoisted(() =>
  vi.fn(async () => ({
    providerId: 'openai-compatible:node-1',
    baseUrl: 'https://compat.example.com/v1',
    apiKey: 'sk-test',
  })),
)

vi.mock('@/lib/model-gateway/openai-compat/common', () => ({
  resolveOpenAICompatClientConfig: resolveOpenAICompatClientConfigMock,
}))

import {
  runOpenAICompatResponsesCompletion,
  runOpenAICompatResponsesStream,
} from '@/lib/model-gateway/openai-compat/responses'

function createSseResponse(events: unknown[]) {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
        controller.close()
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    },
  )
}

describe('model-gateway openai-compat responses executor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('converts responses payload to normalized chat completion', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      output: [
        { type: 'reasoning', text: 'think-' },
        { type: 'output_text', text: 'hello' },
      ],
      usage: {
        input_tokens: 12,
        output_tokens: 7,
      },
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const completion = await runOpenAICompatResponsesCompletion({
      userId: 'user-1',
      providerId: 'openai-compatible:node-1',
      modelId: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: 'hello' }],
      temperature: 0.2,
    })

    expect(completion.choices[0]?.message?.content).toEqual([
      { type: 'reasoning', text: 'think-' },
      { type: 'text', text: 'hello' },
    ])
    expect(completion.usage?.prompt_tokens).toBe(12)
    expect(completion.usage?.completion_tokens).toBe(7)
    const firstCall = fetchMock.mock.calls[0] as unknown[] | undefined
    expect(String(firstCall?.[0])).toBe('https://compat.example.com/v1/responses')
    expect(JSON.parse(String((firstCall?.[1] as RequestInit | undefined)?.body))).not.toHaveProperty('stream')
  })

  it('streams responses deltas and preserves completed usage', async () => {
    const fetchMock = vi.fn(async () => createSseResponse([
      { type: 'response.reasoning_summary_text.delta', delta: 'think-' },
      { type: 'response.output_text.delta', delta: 'hel' },
      { type: 'response.output_text.delta', delta: 'lo' },
      {
        type: 'response.completed',
        response: {
          output_text: 'hello',
          output: [{ type: 'reasoning', text: 'think-' }],
          usage: {
            input_tokens: 12,
            output_tokens: 7,
          },
        },
      },
    ]))
    vi.stubGlobal('fetch', fetchMock)
    const onChunk = vi.fn()

    const completion = await runOpenAICompatResponsesStream(
      {
        userId: 'user-1',
        providerId: 'openai-compatible:node-1',
        modelId: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: 'hello' }],
        temperature: 0.2,
      },
      { onChunk },
      { id: 'step-1', attempt: 1 },
    )

    expect(completion.choices[0]?.message?.content).toEqual([
      { type: 'reasoning', text: 'think-' },
      { type: 'text', text: 'hello' },
    ])
    expect(completion.usage?.prompt_tokens).toBe(12)
    expect(completion.usage?.completion_tokens).toBe(7)
    expect(onChunk).toHaveBeenNthCalledWith(1, expect.objectContaining({
      kind: 'reasoning',
      delta: 'think-',
      seq: 1,
      lane: 'reasoning',
      step: { id: 'step-1', attempt: 1 },
    }))
    expect(onChunk).toHaveBeenNthCalledWith(2, expect.objectContaining({
      kind: 'text',
      delta: 'hel',
      seq: 2,
      lane: 'main',
    }))
    expect(onChunk).toHaveBeenNthCalledWith(3, expect.objectContaining({
      kind: 'text',
      delta: 'lo',
      seq: 3,
      lane: 'main',
    }))
    const firstCall = fetchMock.mock.calls[0] as unknown[] | undefined
    expect(String(firstCall?.[0])).toBe('https://compat.example.com/v1/responses')
    expect(JSON.parse(String((firstCall?.[1] as RequestInit | undefined)?.body))).toMatchObject({
      model: 'gpt-4.1-mini',
      stream: true,
    })
  })

  it('throws status-bearing error when responses endpoint fails', async () => {
    const fetchMock = vi.fn(async () => new Response('not supported', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      runOpenAICompatResponsesCompletion({
        userId: 'user-1',
        providerId: 'openai-compatible:node-1',
        modelId: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: 'hello' }],
        temperature: 0.2,
      }),
    ).rejects.toThrow('OPENAI_COMPAT_RESPONSES_FAILED: 404')
  })
})
