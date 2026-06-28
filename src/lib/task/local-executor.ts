import { UnrecoverableError, type JobsOptions, type Job } from 'bullmq'
import { getUserWorkflowConcurrencyConfig } from '@/lib/config-service'
import { withUserConcurrencyGate } from '@/lib/workers/user-concurrency-gate'
import { withTaskLifecycle } from '@/lib/workers/shared'
import { processImageTask } from '@/lib/workers/image.worker'
import { processTextTask } from '@/lib/workers/text.worker'
import { processVideoTask } from '@/lib/workers/video.worker'
import { processVoiceTask } from '@/lib/workers/voice.worker'
import type { QueueType, TaskJobData } from './types'

type LocalJobEntry = {
  job: Job<TaskJobData>
  timer: ReturnType<typeof setTimeout> | null
  cancelled: boolean
}

const localJobs = new Map<string, LocalJobEntry>()

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveAttempts(opts?: JobsOptions) {
  const attempts = opts?.attempts
  return typeof attempts === 'number' && Number.isFinite(attempts) && attempts > 0
    ? Math.floor(attempts)
    : 1
}

function resolveBackoffMs(opts: JobsOptions | undefined, failedAttempt: number) {
  const backoff = opts?.backoff
  if (typeof backoff === 'number' && Number.isFinite(backoff) && backoff > 0) {
    return Math.floor(backoff)
  }
  if (!backoff || typeof backoff !== 'object') return 0
  const baseDelay = typeof backoff.delay === 'number' && Number.isFinite(backoff.delay)
    ? Math.max(0, Math.floor(backoff.delay))
    : 0
  if (baseDelay <= 0) return 0
  return backoff.type === 'exponential'
    ? baseDelay * Math.pow(2, Math.max(0, failedAttempt - 1))
    : baseDelay
}

function createLocalJob(params: {
  queueName: string
  data: TaskJobData
  opts?: JobsOptions
}): Job<TaskJobData> {
  const job = {
    id: params.data.taskId,
    name: params.data.type,
    data: params.data,
    queueName: params.queueName,
    opts: params.opts || {},
    attemptsMade: 0,
    updateProgress: async () => {},
    log: async () => {},
    remove: async () => {
      await removeLocalTaskJob(params.data.taskId)
    },
  }
  return job as unknown as Job<TaskJobData>
}

async function runByQueueType(queueType: QueueType, job: Job<TaskJobData>) {
  switch (queueType) {
    case 'image': {
      const workflowConcurrency = await getUserWorkflowConcurrencyConfig(job.data.userId)
      return await withUserConcurrencyGate({
        scope: 'image',
        userId: job.data.userId,
        limit: workflowConcurrency.image,
        run: async () => await processImageTask(job),
      })
    }
    case 'video': {
      const workflowConcurrency = await getUserWorkflowConcurrencyConfig(job.data.userId)
      return await withUserConcurrencyGate({
        scope: 'video',
        userId: job.data.userId,
        limit: workflowConcurrency.video,
        run: async () => await processVideoTask(job),
      })
    }
    case 'voice':
      return await processVoiceTask(job)
    case 'text':
    default:
      return await processTextTask(job)
  }
}

async function runLocalEntry(queueType: QueueType, entry: LocalJobEntry) {
  const maxAttempts = resolveAttempts(entry.job.opts)
  let attemptsMade = 0

  try {
    while (!entry.cancelled && attemptsMade < maxAttempts) {
      ;(entry.job as Job<TaskJobData> & { attemptsMade: number }).attemptsMade = attemptsMade
      try {
        await withTaskLifecycle(entry.job, async (job) => await runByQueueType(queueType, job))
        return
      } catch (error) {
        attemptsMade += 1
        if (error instanceof UnrecoverableError || attemptsMade >= maxAttempts || entry.cancelled) {
          return
        }
        await delay(resolveBackoffMs(entry.job.opts, attemptsMade))
      }
    }
  } finally {
    localJobs.delete(entry.job.data.taskId)
  }
}

export async function addLocalTaskJob(params: {
  queueType: QueueType
  queueName: string
  data: TaskJobData
  opts?: JobsOptions
}) {
  const previous = localJobs.get(params.data.taskId)
  if (previous?.timer) clearTimeout(previous.timer)

  const job = createLocalJob(params)
  const entry: LocalJobEntry = {
    job,
    timer: null,
    cancelled: false,
  }
  entry.timer = setTimeout(() => {
    entry.timer = null
    void runLocalEntry(params.queueType, entry)
  }, 50)
  localJobs.set(params.data.taskId, entry)
  return job
}

export async function removeLocalTaskJob(taskId: string) {
  const entry = localJobs.get(taskId)
  if (!entry) return false
  entry.cancelled = true
  if (entry.timer) clearTimeout(entry.timer)
  localJobs.delete(taskId)
  return true
}
