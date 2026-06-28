import { EventEmitter } from 'node:events'
import { logDebug as _ulogDebug, logError as _ulogError } from '@/lib/logging/core'
import { isRedisDisabled } from '@/lib/runtime/desktop'
import Redis from 'ioredis'

type RedisSingleton = {
  app?: Redis
  queue?: Redis
}

type GlobalRedisState = typeof globalThis & {
  __waoowaooRedis?: RedisSingleton
  __waoowaooLocalBus?: EventEmitter
}

const globalForRedis = globalThis as GlobalRedisState

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1'
const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT || '6379', 10) || 6379
const REDIS_USERNAME = process.env.REDIS_USERNAME
const REDIS_PASSWORD = process.env.REDIS_PASSWORD
const REDIS_TLS = process.env.REDIS_TLS === 'true'
const IS_TEST_ENV = process.env.NODE_ENV === 'test'

function localBus() {
  if (!globalForRedis.__waoowaooLocalBus) {
    globalForRedis.__waoowaooLocalBus = new EventEmitter()
    globalForRedis.__waoowaooLocalBus.setMaxListeners(0)
  }
  return globalForRedis.__waoowaooLocalBus
}

function createLocalRedis(scope: string): Redis {
  const emitter = new EventEmitter() as EventEmitter & {
    publish: (channel: string, message: string) => Promise<number>
    subscribe: (...channels: string[]) => Promise<number>
    unsubscribe: (...channels: string[]) => Promise<number>
    duplicate: () => Redis
    eval: () => Promise<[number, number, number]>
    quit: () => Promise<'OK'>
    disconnect: () => void
  }
  const subscriptions = new Map<string, (message: string) => void>()
  emitter.setMaxListeners(0)

  emitter.publish = async (channel, message) => {
    localBus().emit(channel, message)
    return localBus().listenerCount(channel)
  }
  emitter.subscribe = async (...channels) => {
    for (const channel of channels) {
      if (subscriptions.has(channel)) continue
      const handler = (message: string) => emitter.emit('message', channel, message)
      subscriptions.set(channel, handler)
      localBus().on(channel, handler)
    }
    _ulogDebug(`[Redis:${scope}] local subscribe ${channels.join(',')}`)
    return subscriptions.size
  }
  emitter.unsubscribe = async (...channels) => {
    const targets = channels.length ? channels : Array.from(subscriptions.keys())
    for (const channel of targets) {
      const handler = subscriptions.get(channel)
      if (!handler) continue
      localBus().off(channel, handler)
      subscriptions.delete(channel)
    }
    return subscriptions.size
  }
  emitter.duplicate = () => createLocalRedis(`${scope}:dup`)
  emitter.eval = async () => [0, 0, 0]
  emitter.quit = async () => {
    await emitter.unsubscribe()
    return 'OK'
  }
  emitter.disconnect = () => {
    void emitter.unsubscribe()
  }

  _ulogDebug(`[Redis:${scope}] using in-process desktop event bus`)
  return emitter as unknown as Redis
}

function buildBaseConfig() {
  return {
    host: REDIS_HOST,
    port: REDIS_PORT,
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    tls: REDIS_TLS ? {} : undefined,
    enableReadyCheck: true,
    lazyConnect: IS_TEST_ENV,
    retryStrategy(times: number) {
      return Math.min(2 ** Math.min(times, 10) * 100, 30_000)
    },
  }
}

function onConnectLog(scope: string, client: Redis) {
  client.on('connect', () => _ulogDebug(`[Redis:${scope}] connected ${REDIS_HOST}:${REDIS_PORT}`))
  client.on('error', (err) => _ulogError(`[Redis:${scope}] error:`, err.message))
}

function createAppRedis() {
  if (isRedisDisabled()) return createLocalRedis('app')
  const client = new Redis({
    ...buildBaseConfig(),
    maxRetriesPerRequest: 2,
  })
  onConnectLog('app', client)
  return client
}

function createQueueRedis() {
  if (isRedisDisabled()) return createLocalRedis('queue')
  const client = new Redis({
    ...buildBaseConfig(),
    maxRetriesPerRequest: null,
  })
  onConnectLog('queue', client)
  return client
}

const singleton = globalForRedis.__waoowaooRedis || {}
if (!globalForRedis.__waoowaooRedis) {
  globalForRedis.__waoowaooRedis = singleton
}

export const redis = singleton.app || (singleton.app = createAppRedis())
export const queueRedis = singleton.queue || (singleton.queue = createQueueRedis())

export function createSubscriber() {
  if (isRedisDisabled()) return createLocalRedis('sub')
  const client = new Redis({
    ...buildBaseConfig(),
    maxRetriesPerRequest: null,
  })
  onConnectLog('sub', client)
  return client
}
