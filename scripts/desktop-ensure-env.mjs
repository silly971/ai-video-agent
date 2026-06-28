import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import path from 'node:path'

const envPath = '.env'
const examplePath = '.env.example'

function randomSecret(prefix) {
  return `${prefix}-${randomBytes(18).toString('hex')}`
}

function parseEnv(content) {
  const lines = content.split(/\r?\n/)
  const values = new Map()
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/)
    if (!match) continue
    values.set(match[1], match[2])
  }
  return values
}

function isPlaceholder(value) {
  const normalized = String(value || '').replace(/^["']|["']$/g, '').trim().toLowerCase()
  return !normalized || normalized.includes('please-change') || normalized.includes('changeme')
}

function quote(value) {
  return /[\s#"'`]/.test(value) ? JSON.stringify(value) : value
}

function upsertEnv(content, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  const line = `${key}=${quote(value)}`
  if (pattern.test(content)) return content.replace(pattern, line)
  return `${content.replace(/\s*$/, '')}\n${line}\n`
}

const base = existsSync(envPath)
  ? readFileSync(envPath, 'utf8')
  : (existsSync(examplePath) ? readFileSync(examplePath, 'utf8') : '')
const current = parseEnv(base)

mkdirSync(path.join('data', 'uploads'), { recursive: true })

const forcedDesktopValues = {
  DATABASE_URL: 'file:./data/desktop.db',
  STORAGE_TYPE: 'local',
  UPLOAD_DIR: './data/uploads',
  DESKTOP_MODE: 'true',
  TASK_QUEUE_MODE: 'local',
  REDIS_DISABLED: 'true',
  NEXTAUTH_URL: 'http://127.0.0.1:3000',
  INTERNAL_APP_URL: 'http://127.0.0.1:3000',
  BILLING_MODE: current.get('BILLING_MODE') || 'OFF',
  LOG_LEVEL: current.get('LOG_LEVEL') || 'INFO',
}

const secretDefaults = {
  NEXTAUTH_SECRET: randomSecret('desktop-nextauth'),
  CRON_SECRET: randomSecret('desktop-cron'),
  INTERNAL_TASK_TOKEN: randomSecret('desktop-task'),
  API_ENCRYPTION_KEY: randomSecret('desktop-crypto'),
}

let updated = base || '# AI Video Agent desktop local environment\n'
for (const [key, value] of Object.entries(forcedDesktopValues)) {
  updated = upsertEnv(updated, key, value)
}
for (const [key, generated] of Object.entries(secretDefaults)) {
  const currentValue = current.get(key)
  updated = upsertEnv(updated, key, isPlaceholder(currentValue) ? generated : currentValue)
}

writeFileSync(envPath, updated, 'utf8')
console.log('[desktop:env] prepared .env for SQLite, local storage, and the in-process task queue')
