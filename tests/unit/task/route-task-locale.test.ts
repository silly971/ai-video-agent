import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { TASK_TYPE } from '@/lib/task/types'

const submitTaskMock = vi.hoisted(() => vi.fn(async () => ({
  success: true,
  async: true,
  taskId: 'task-1',
  runId: null,
  status: 'queued',
  deduped: false,
})))

vi.mock('@/lib/task/submitter', () => ({
  submitTask: submitTaskMock,
}))

vi.mock('@/lib/billing', () => ({
  buildDefaultTaskBillingInfo: vi.fn(() => null),
  isBillableTaskType: vi.fn(() => false),
}))

vi.mock('@/lib/config-service', () => ({
  getProjectModelConfig: vi.fn(async () => ({})),
  getUserModelConfig: vi.fn(async () => ({})),
}))

function buildRequest() {
  return new NextRequest(new URL('/api/novel-promotion/project-1/episodes/split', 'http://localhost:3000'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'x'.repeat(120) }),
  })
}

describe('route task locale fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits async llm tasks with default zh locale when request has no locale header', async () => {
    const { maybeSubmitLLMTask } = await import('@/lib/llm-observe/route-task')

    const response = await maybeSubmitLLMTask({
      request: buildRequest(),
      userId: 'user-1',
      projectId: 'project-1',
      type: TASK_TYPE.EPISODE_SPLIT_LLM,
      targetType: 'NovelPromotionProject',
      targetId: 'project-1',
      routePath: '/api/novel-promotion/project-1/episodes/split',
      body: { content: 'x'.repeat(120) },
      dedupeKey: 'episode_split_llm:project-1:120',
    })

    expect(response?.status).toBe(200)
    expect(submitTaskMock).toHaveBeenCalledWith(expect.objectContaining({
      locale: 'zh',
      payload: expect.objectContaining({
        meta: expect.objectContaining({
          locale: 'zh',
          route: '/api/novel-promotion/project-1/episodes/split',
        }),
      }),
    }))
  })
})
