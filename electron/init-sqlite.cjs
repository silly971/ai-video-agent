const { createRequire } = require('node:module')
const fs = require('node:fs')
const path = require('node:path')

const appRoot = path.join(__dirname, '..')
const standaloneServer = path.join(appRoot, '.next', 'standalone', 'server.js')
const requireFromRuntime = fs.existsSync(standaloneServer)
  ? createRequire(standaloneServer)
  : require
const { PrismaClient } = requireFromRuntime('@prisma/client')

function splitStatements(sql) {
  const statements = []
  let current = []
  for (const line of sql.split(/\r?\n/)) {
    current.push(line)
    if (line.trim().endsWith(';')) {
      statements.push(current.join('\n'))
      current = []
    }
  }
  if (current.join('').trim()) statements.push(current.join('\n'))
  return statements
}

function normalizeStatement(statement) {
  const withoutComments = statement
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim()
    .replace(/;$/, '')
  if (!withoutComments) return ''
  return withoutComments
    .replace(/^CREATE TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/^CREATE UNIQUE INDEX\s+/i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
    .replace(/^CREATE INDEX\s+/i, 'CREATE INDEX IF NOT EXISTS ')
}

async function main() {
  const schemaSqlPath = path.join(appRoot, 'prisma', 'desktop-schema.sql')
  if (!fs.existsSync(schemaSqlPath)) {
    throw new Error(`Missing SQLite schema SQL: ${schemaSqlPath}`)
  }

  const prisma = new PrismaClient()
  const statements = splitStatements(fs.readFileSync(schemaSqlPath, 'utf8'))
    .map(normalizeStatement)
    .filter(Boolean)

  try {
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement)
    }
  } finally {
    await prisma.$disconnect()
  }
}

void main().catch((error) => {
  console.error('[desktop-sqlite] failed to initialize database')
  console.error(error)
  process.exit(1)
})
