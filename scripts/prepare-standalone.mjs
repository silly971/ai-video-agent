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

async function copyRequired(from, to) {
  if (!existsSync(from)) {
    throw new Error(`Missing required standalone asset: ${from}`)
  }
  await fs.rm(to, { recursive: true, force: true })
  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.cp(from, to, { recursive: true })
}

function assertExists(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing standalone asset after copy: ${filePath}`)
  }
}

async function main() {
  if (!existsSync(standaloneDir)) {
    console.log('[prepare-standalone] skipped: .next/standalone not found')
    return
  }

  await copyIfExists(path.join('.next', 'static'), path.join(standaloneDir, '.next', 'static'))
  await copyIfExists('public', path.join(standaloneDir, 'public'))
  await copyIfExists('messages', path.join(standaloneDir, 'messages'))
  await copyRequired(path.join('lib', 'prompts'), path.join(standaloneDir, 'lib', 'prompts'))

  assertExists(path.join(standaloneDir, 'lib', 'prompts', 'novel-promotion', 'episode_split.zh.txt'))
  assertExists(path.join(standaloneDir, 'lib', 'prompts', 'novel-promotion', 'episode_split.en.txt'))
  console.log('[prepare-standalone] copied runtime assets into .next/standalone')
}

void main().catch((error) => {
  console.error('[prepare-standalone] failed')
  console.error(error)
  process.exit(1)
})
