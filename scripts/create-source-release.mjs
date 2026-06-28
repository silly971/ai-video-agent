import { createWriteStream, mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import archiver from 'archiver'

const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
const version = packageJson.version || '0.0.0'
const outDir = 'release'
const outFile = path.join(outDir, `ai-video-agent-v${version}-source.zip`)

mkdirSync(outDir, { recursive: true })

const output = createWriteStream(outFile)
const archive = archiver('zip', { zlib: { level: 9 } })

archive.on('warning', (error) => {
  if (error.code === 'ENOENT') return
  throw error
})

archive.pipe(output)
archive.glob('**/*', {
  dot: true,
  ignore: [
    '.git/**',
    '.next/**',
    'node_modules/**',
    'release/**',
    'data/**',
    'docker-logs/**',
    'logs/**',
    '.env',
    '.env.*',
    '*.log',
  ],
})

await archive.finalize()

await new Promise((resolve, reject) => {
  output.on('close', resolve)
  output.on('error', reject)
})

console.log(`[release:source] wrote ${outFile}`)
