import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  $queryRawUnsafe: vi.fn(),
  graphArtifact: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

describe('graph artifact unique index check', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', 'file:./desktop.db')

    prismaMock.$queryRawUnsafe.mockImplementation(async (query: string) => {
      if (query === 'PRAGMA index_list("graph_artifacts")') {
        return [{ name: 'graph_artifacts_runId_stepKey_artifactType_refId_key', unique: 1 }]
      }
      if (query === 'PRAGMA index_info("graph_artifacts_runId_stepKey_artifactType_refId_key")') {
        return [
          { seqno: 0, name: 'runId' },
          { seqno: 1, name: 'stepKey' },
          { seqno: 2, name: 'artifactType' },
          { seqno: 3, name: 'refId' },
        ]
      }
      throw new Error(`unexpected query: ${query}`)
    })

    prismaMock.graphArtifact.upsert.mockResolvedValue({
      id: 'artifact-1',
      runId: 'run-1',
      stepKey: 'character-analysis',
      artifactType: 'step.output',
      refId: 'character-analysis',
      versionHash: null,
      payload: { ok: true },
      createdAt: new Date('2026-06-30T00:00:00.000Z'),
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses SQLite PRAGMA queries instead of SHOW INDEX for desktop databases', async () => {
    const { createArtifact } = await import('@/lib/run-runtime/service')

    await createArtifact({
      runId: 'run-1',
      stepKey: 'character-analysis',
      artifactType: 'step.output',
      refId: 'character-analysis',
      payload: { ok: true },
    })

    const queries = prismaMock.$queryRawUnsafe.mock.calls.map(([query]) => String(query))
    expect(queries).toEqual([
      'PRAGMA index_list("graph_artifacts")',
      'PRAGMA index_info("graph_artifacts_runId_stepKey_artifactType_refId_key")',
    ])
    expect(queries.some((query) => query.includes('SHOW INDEX'))).toBe(false)
    expect(prismaMock.graphArtifact.upsert).toHaveBeenCalledOnce()
  })
})
