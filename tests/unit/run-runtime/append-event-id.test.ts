import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RUN_EVENT_TYPE } from '@/lib/run-runtime/types'

const txMock = vi.hoisted(() => ({
  graphRun: {
    update: vi.fn(),
  },
  graphStep: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
  },
  graphStepAttempt: {
    upsert: vi.fn(),
  },
  graphEvent: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  graphCheckpoint: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  graphArtifact: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

const transactionMock = vi.hoisted(() => vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: transactionMock,
  },
}))

describe('appendRunEventWithSeq', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    txMock.graphRun.update.mockResolvedValue({ id: 'run-1', lastSeq: 3 })
    txMock.graphEvent.findFirst.mockResolvedValue({ id: BigInt(41) })
    txMock.graphEvent.create.mockImplementation(async (args: unknown) => {
      const data = (args as { data: Record<string, unknown> }).data
      return {
        id: data.id,
        runId: data.runId,
        projectId: data.projectId,
        userId: data.userId,
        seq: data.seq,
        eventType: data.eventType,
        stepKey: data.stepKey,
        attempt: data.attempt,
        lane: data.lane,
        payload: data.payload,
        createdAt: new Date('2026-06-28T00:00:00.000Z'),
      }
    })
  })

  it('provides a graph event id because SQLite BigInt primary keys are not implicit rowids', async () => {
    const { appendRunEventWithSeq } = await import('@/lib/run-runtime/service')

    const event = await appendRunEventWithSeq({
      runId: 'run-1',
      projectId: 'project-1',
      userId: 'user-1',
      eventType: RUN_EVENT_TYPE.RUN_START,
      payload: { source: 'test' },
    })

    expect(txMock.graphEvent.findFirst).toHaveBeenCalledWith({
      select: { id: true },
      orderBy: { id: 'desc' },
    })
    expect(txMock.graphEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: BigInt(42),
        runId: 'run-1',
        projectId: 'project-1',
        userId: 'user-1',
        seq: 3,
        eventType: RUN_EVENT_TYPE.RUN_START,
      }),
    })
    expect(event.id).toBe('42')
  })
})
