import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const standaloneDir = path.join('.next', 'standalone')

async function copyIfExists(from, to) {
  if (!existsSync(from)) return
  await fs.rm(to, { recursive: true, force: true })
  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.cp(from, to, { recursive: true })
}

async function main() {
  if (!existsSync(standaloneDir)) {
    console.log('[prepare-standalone] skipped: .next/standalone not found')
    return
  }

  await copyIfExists(path.join('.next', 'static'), path.join(standaloneDir, '.next', 'static'))
  await copyIfExists('public', path.join(standaloneDir, 'public'))
  await copyIfExists('messages', path.join(standaloneDir, 'messages'))
  console.log('[prepare-standalone] copied static assets into .next/standalone')
}

void main().catch((error) => {
  console.error('[prepare-standalone] failed')
  console.error(error)
  process.exit(1)
})
