export function isDesktopRuntime() {
  return process.env.DESKTOP_MODE === 'true'
}

export function isLocalTaskQueue() {
  return isDesktopRuntime() || process.env.TASK_QUEUE_MODE === 'local'
}

export function isRedisDisabled() {
  return isDesktopRuntime() || process.env.REDIS_DISABLED === 'true'
}
