import { JobsOptions, Queue } from 'bullmq'
import { queueRedis } from '@/lib/redis'
import { isLocalTaskQueue } from '@/lib/runtime/desktop'
import { QueueType, TaskType, TASK_TYPE, type TaskJobData } from './types'

export const QUEUE_NAME = {
  IMAGE: 'waoowaoo-image',
  VIDEO: 'waoowaoo-video',
  VOICE: 'waoowaoo-voice',
  TEXT: 'waoowaoo-text',
} as const

const defaultJobOptions: JobsOptions = {
  removeOnComplete: 500,
  removeOnFail: 500,
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2_000,
  },
}

function createQueue(name: typeof QUEUE_NAME[keyof typeof QUEUE_NAME]) {
  if (isLocalTaskQueue()) {
    return {
      name,
      async add() {
        throw new Error('BullMQ queue.add is disabled in desktop local queue mode')
      },
      async getJob() {
        return null
      },
    } as unknown as Queue<TaskJobData>
  }
  return new Queue<TaskJobData>(name, {
    connection: queueRedis,
    defaultJobOptions,
  })
}

export const imageQueue = createQueue(QUEUE_NAME.IMAGE)
export const videoQueue = createQueue(QUEUE_NAME.VIDEO)
export const voiceQueue = createQueue(QUEUE_NAME.VOICE)
export const textQueue = createQueue(QUEUE_NAME.TEXT)

const ALL_QUEUES = [imageQueue, videoQueue, voiceQueue, textQueue]

const IMAGE_TYPES = new Set<TaskType>([
  TASK_TYPE.IMAGE_PANEL,
  TASK_TYPE.IMAGE_CHARACTER,
  TASK_TYPE.IMAGE_LOCATION,
  TASK_TYPE.PANEL_VARIANT,
  TASK_TYPE.MODIFY_ASSET_IMAGE,
  TASK_TYPE.REGENERATE_GROUP,
  TASK_TYPE.ASSET_HUB_IMAGE,
  TASK_TYPE.ASSET_HUB_MODIFY,
])

const VIDEO_TYPES = new Set<TaskType>([TASK_TYPE.VIDEO_PANEL, TASK_TYPE.LIP_SYNC])
const VOICE_TYPES = new Set<TaskType>([
  TASK_TYPE.VOICE_LINE,
  TASK_TYPE.VOICE_DESIGN,
  TASK_TYPE.ASSET_HUB_VOICE_DESIGN,
])

const SINGLE_ATTEMPT_TASK_TYPES = new Set<TaskType>([
  TASK_TYPE.STORY_TO_SCRIPT_RUN,
  TASK_TYPE.SCRIPT_TO_STORYBOARD_RUN,
])

export function getQueueTypeByTaskType(type: TaskType): QueueType {
  if (IMAGE_TYPES.has(type)) return 'image'
  if (VIDEO_TYPES.has(type)) return 'video'
  if (VOICE_TYPES.has(type)) return 'voice'
  return 'text'
}

export function getQueueByType(type: QueueType) {
  switch (type) {
    case 'image':
      return imageQueue
    case 'video':
      return videoQueue
    case 'voice':
      return voiceQueue
    case 'text':
    default:
      return textQueue
  }
}

export async function addTaskJob(data: TaskJobData, opts?: JobsOptions) {
  const queueType = getQueueTypeByTaskType(data.type)
  const priority = typeof opts?.priority === 'number' ? opts.priority : 0
  const attempts = SINGLE_ATTEMPT_TASK_TYPES.has(data.type)
    ? 1
    : (typeof opts?.attempts === 'number' ? opts.attempts : undefined)
  const jobOptions = {
    ...defaultJobOptions,
    ...(opts || {}),
    priority,
    ...(attempts !== undefined ? { attempts } : {}),
  }
  if (isLocalTaskQueue()) {
    const { addLocalTaskJob } = await import('./local-executor')
    return await addLocalTaskJob({
      queueType,
      queueName: getQueueByType(queueType).name,
      data,
      opts: jobOptions,
    })
  }
  const queue = getQueueByType(queueType)
  return await queue.add(data.type, data, {
    jobId: data.taskId,
    ...jobOptions,
  })
}

export async function removeTaskJob(taskId: string) {
  if (isLocalTaskQueue()) {
    const { removeLocalTaskJob } = await import('./local-executor')
    return await removeLocalTaskJob(taskId)
  }
  for (const queue of ALL_QUEUES) {
    const job = await queue.getJob(taskId)
    if (!job) continue
    await job.remove()
    return true
  }
  return false
}
