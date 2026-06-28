import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

function run(command, args) {
  const executable = command === 'npm' && process.platform === 'win32'
    ? process.execPath
    : command
  const finalArgs = command === 'npm' && process.platform === 'win32'
    ? [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), ...args]
    : args
  const result = spawnSync(executable, finalArgs, { encoding: 'utf8' })
  return {
    ok: result.status === 0,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
  }
}

function line(label, ok, detail) {
  const marker = ok ? 'OK' : 'FAIL'
  console.log(`[${marker}] ${label}${detail ? ` - ${detail}` : ''}`)
}

function envValue(key) {
  if (!existsSync('.env')) return ''
  const content = readFileSync('.env', 'utf8')
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].replace(/^["']|["']$/g, '').trim() : ''
}

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] || '0', 10)
line('Node.js >= 18.18', nodeMajor >= 18, process.versions.node)

const npm = run('npm', ['--version'])
line('npm available', npm.ok, npm.output)

const prisma = run('npm', ['exec', '--', 'prisma', '--version'])
line('Prisma CLI available', prisma.ok, prisma.output.split(/\r?\n/)[0])

line('Electron shell exists', existsSync('electron/main.cjs') && existsSync('electron/next-server.cjs'))
line('.env exists', existsSync('.env'), existsSync('.env') ? '.env' : 'run npm run desktop:env')
line('DATABASE_URL uses SQLite', envValue('DATABASE_URL').startsWith('file:'), envValue('DATABASE_URL') || 'missing')
line('STORAGE_TYPE=local', envValue('STORAGE_TYPE') === 'local', envValue('STORAGE_TYPE') || 'missing')
line('TASK_QUEUE_MODE=local', envValue('TASK_QUEUE_MODE') === 'local', envValue('TASK_QUEUE_MODE') || 'missing')

console.log('')
console.log('Desktop startup:')
console.log('  1. npm install')
console.log('  2. npm run desktop:setup')
console.log('  3. npm run desktop')
console.log('')
console.log('Desktop exe:')
console.log('  npm run build:desktop')
