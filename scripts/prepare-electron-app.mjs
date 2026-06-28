import fs from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const outDir = 'desktop-dist'

async function copy(from, to) {
  if (!existsSync(from)) {
    throw new Error(`Missing required desktop packaging input: ${from}`)
  }
  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.cp(from, to, { recursive: true })
}

async function main() {
  const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'))
  await fs.rm(outDir, { recursive: true, force: true })
  await fs.mkdir(outDir, { recursive: true })

  await copy('electron', path.join(outDir, 'electron'))
  await copy(path.join('.next', 'standalone'), path.join(outDir, '.next', 'standalone'))
  await copy(path.join('prisma', 'schema.prisma'), path.join(outDir, 'prisma', 'schema.prisma'))
  await copy(path.join('prisma', 'desktop-schema.sql'), path.join(outDir, 'prisma', 'desktop-schema.sql'))
  await copy('README.md', path.join(outDir, 'README.md'))

  const desktopPackage = {
    name: rootPackage.name,
    version: rootPackage.version,
    private: true,
    description: rootPackage.description,
    main: 'electron/main.cjs',
    author: rootPackage.author,
    license: rootPackage.license,
  }
  await fs.writeFile(
    path.join(outDir, 'package.json'),
    `${JSON.stringify(desktopPackage, null, 2)}\n`,
    'utf8',
  )

  console.log(`[desktop-dist] prepared ${outDir}`)
}

void main().catch((error) => {
  console.error('[desktop-dist] failed')
  console.error(error)
  process.exit(1)
})
