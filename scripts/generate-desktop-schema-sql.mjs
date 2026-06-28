import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const npmCli = process.platform === 'win32'
  ? path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  : null
const executable = npmCli ? process.execPath : 'npm'
const args = npmCli ? [npmCli, 'exec', '--'] : ['exec', '--']
const result = spawnSync(executable, [
  ...args,
  'prisma',
  'migrate',
  'diff',
  '--from-empty',
  '--to-schema-datamodel',
  'prisma/schema.prisma',
  '--script',
], {
  encoding: 'utf8',
})

if (result.status !== 0) {
  if (result.error) console.error(result.error)
  console.error(result.stdout)
  console.error(result.stderr)
  process.exit(result.status || 1)
}

const outFile = path.join('prisma', 'desktop-schema.sql')
mkdirSync(path.dirname(outFile), { recursive: true })
writeFileSync(outFile, result.stdout, 'utf8')
console.log(`[desktop-schema] wrote ${outFile}`)
