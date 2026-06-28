const { app, BrowserWindow, Menu, shell } = require('electron')
const { spawn } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')

const DEV_APP_URL = 'http://127.0.0.1:3000/zh/home'
const DEFAULT_PACKAGED_PORT = 13000

let serverProcess = null
let runtimeEnv = null
let runtimeUrl = null
let runtimeLogStream = null

function resolveArgValue(name) {
  const prefix = `${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : ''
}

function externalAppUrl() {
  return resolveArgValue('--server-url') || process.env.WAOOWAOO_DESKTOP_URL || ''
}

function resolveAppRoot() {
  return app.isPackaged ? path.join(process.resourcesPath, 'app') : path.join(__dirname, '..')
}

function normalizeForEnv(value) {
  return value.replace(/\\/g, '/')
}

function toPrismaFileUrl(filePath) {
  return `file:${normalizeForEnv(filePath)}`
}

function randomSecret(prefix) {
  return `${prefix}-${crypto.randomBytes(24).toString('hex')}`
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return {}
  }
}

function readOrCreateSecrets(userDataPath) {
  const filePath = path.join(userDataPath, 'desktop-secrets.json')
  const current = readJson(filePath)
  const next = {
    nextAuthSecret: current.nextAuthSecret || randomSecret('desktop-nextauth'),
    cronSecret: current.cronSecret || randomSecret('desktop-cron'),
    internalTaskToken: current.internalTaskToken || randomSecret('desktop-task'),
    apiEncryptionKey: current.apiEncryptionKey || randomSecret('desktop-crypto'),
  }
  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  return next
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
  return dirPath
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, '127.0.0.1')
  })
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await canListen(port)) return port
  }
  throw new Error('No available local port for the desktop app')
}

function buildRuntimeEnv(port) {
  const userDataPath = ensureDir(app.getPath('userData'))
  const dataPath = ensureDir(path.join(userDataPath, 'data'))
  const uploadPath = ensureDir(path.join(userDataPath, 'uploads'))
  const logPath = ensureDir(path.join(userDataPath, 'logs'))
  const secrets = readOrCreateSecrets(userDataPath)
  const baseUrl = `http://127.0.0.1:${port}`

  return {
    ...process.env,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    DESKTOP_MODE: 'true',
    TASK_QUEUE_MODE: 'local',
    REDIS_DISABLED: 'true',
    STORAGE_TYPE: 'local',
    UPLOAD_DIR: uploadPath,
    DATABASE_URL: toPrismaFileUrl(path.join(dataPath, 'ai-video-agent.db')),
    NEXTAUTH_URL: baseUrl,
    INTERNAL_APP_URL: baseUrl,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || secrets.nextAuthSecret,
    CRON_SECRET: process.env.CRON_SECRET || secrets.cronSecret,
    INTERNAL_TASK_TOKEN: process.env.INTERNAL_TASK_TOKEN || secrets.internalTaskToken,
    API_ENCRYPTION_KEY: process.env.API_ENCRYPTION_KEY || secrets.apiEncryptionKey,
    BILLING_MODE: process.env.BILLING_MODE || 'OFF',
    LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    NEXT_APP_DIR: resolveAppRoot(),
    DESKTOP_USER_DATA: userDataPath,
    DESKTOP_LOG_DIR: logPath,
  }
}

function pageHtml(title, paragraphs) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Video Agent</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, "Microsoft YaHei", system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0f172a; color: #f8fafc; }
    main { width: min(720px, calc(100vw - 48px)); border: 1px solid rgba(148, 163, 184, .35); border-radius: 8px; padding: 24px; background: rgba(15, 23, 42, .82); }
    h1 { margin: 0 0 12px; font-size: 28px; letter-spacing: 0; }
    p { margin: 8px 0; color: #cbd5e1; line-height: 1.7; }
    code { color: #bae6fd; word-break: break-all; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    ${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('\n    ')}
  </main>
</body>
</html>`
}

function loadingHtml(target) {
  const targetLine = target ? `目标地址：<code>${target}</code>` : '正在准备本地桌面运行时。'
  return pageHtml('AI Video Agent 正在启动', [
    '正在初始化本地 SQLite 数据库、文件存储和内置任务执行器。',
    targetLine,
    '首次启动会稍慢一些；后续会直接打开工作台。',
  ])
}

function errorHtml(target, error) {
  const message = error instanceof Error ? error.message : String(error)
  const escaped = message.replace(/[<>&]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[char])
  const logPath = runtimeEnv?.DESKTOP_LOG_DIR ? path.join(runtimeEnv.DESKTOP_LOG_DIR, 'desktop-next.log') : ''
  return pageHtml('AI Video Agent 启动失败', [
    target ? `目标地址：<code>${target}</code>` : '本地服务没有启动成功。',
    `错误信息：<code>${escaped}</code>`,
    logPath ? `日志文件：<code>${logPath}</code>` : '请重新打开应用，或从源码运行 npm run desktop:doctor 检查环境。',
  ])
}

async function canReach(url) {
  try {
    const response = await fetch(url, { method: 'GET' })
    return response.status < 500
  } catch {
    return false
  }
}

function runElectronNode(args, env, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: resolveAppRoot(),
      windowsHide: true,
      ...options,
      env: {
        ...env,
        ELECTRON_RUN_AS_NODE: '1',
      },
    })
    let output = ''
    child.stdout?.on('data', (chunk) => { output += chunk.toString() })
    child.stderr?.on('data', (chunk) => { output += chunk.toString() })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(output)
      else reject(new Error(`${args.join(' ')} failed with code ${code}: ${output.trim()}`))
    })
  })
}

async function ensureDatabase(env) {
  const appRoot = resolveAppRoot()
  const initScript = path.join(appRoot, 'electron', 'init-sqlite.cjs')
  if (!fs.existsSync(initScript)) {
    throw new Error(`Missing SQLite init script: ${initScript}`)
  }
  await runElectronNode([initScript], env)
}

function startNextServer(env) {
  const appRoot = resolveAppRoot()
  const standaloneServer = path.join(appRoot, '.next', 'standalone', 'server.js')
  const fallbackServer = path.join(appRoot, 'electron', 'next-server.cjs')
  const serverScript = fs.existsSync(standaloneServer) ? standaloneServer : fallbackServer
  if (!fs.existsSync(serverScript)) {
    throw new Error(`Missing desktop Next server script: ${serverScript}`)
  }
  const cwd = serverScript === standaloneServer ? path.dirname(standaloneServer) : appRoot

  const logFile = path.join(env.DESKTOP_LOG_DIR, 'desktop-next.log')
  runtimeLogStream = fs.createWriteStream(logFile, { flags: 'a' })
  runtimeLogStream.write(`\n[desktop] ${new Date().toISOString()} starting Next server\n`)

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd,
    windowsHide: true,
    env: {
      ...env,
      ELECTRON_RUN_AS_NODE: '1',
    },
  })
  serverProcess.stdout?.pipe(runtimeLogStream)
  serverProcess.stderr?.pipe(runtimeLogStream)
  serverProcess.on('exit', (code, signal) => {
    runtimeLogStream?.write(`[desktop] Next server exited code=${code} signal=${signal}\n`)
  })
}

async function ensurePackagedRuntime() {
  const external = externalAppUrl()
  if (external) return external
  if (!app.isPackaged) return process.env.NEXTAUTH_URL || DEV_APP_URL
  if (runtimeUrl) return runtimeUrl

  const port = await findAvailablePort(Number.parseInt(process.env.PORT || String(DEFAULT_PACKAGED_PORT), 10) || DEFAULT_PACKAGED_PORT)
  runtimeEnv = buildRuntimeEnv(port)
  runtimeUrl = `http://127.0.0.1:${port}/zh/home`

  await ensureDatabase(runtimeEnv)
  startNextServer(runtimeEnv)
  return runtimeUrl
}

async function loadWhenReady(window) {
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml(runtimeUrl))}`)

  let targetUrl = ''
  try {
    targetUrl = await ensurePackagedRuntime()
  } catch (error) {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml(targetUrl, error))}`)
    return
  }

  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml(targetUrl))}`)
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (window.isDestroyed()) return
    if (await canReach(targetUrl)) {
      await window.loadURL(targetUrl)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml(targetUrl, new Error('Local desktop service startup timed out')))}`)
}

function createMenu(window) {
  return Menu.buildFromTemplate([
    {
      label: 'AI Video Agent',
      submenu: [
        { label: '重新载入', accelerator: 'CmdOrCtrl+R', click: () => window.reload() },
        { label: '打开开发者工具', accelerator: 'F12', click: () => window.webContents.openDevTools({ mode: 'detach' }) },
        { type: 'separator' },
        { label: '退出', role: 'quit' },
      ],
    },
    {
      label: '本地',
      submenu: [
        { label: '打开工作台', click: () => runtimeUrl && window.loadURL(runtimeUrl) },
        { label: '在浏览器中打开', click: () => runtimeUrl && shell.openExternal(runtimeUrl) },
        { label: '打开数据目录', click: () => shell.openPath(app.getPath('userData')) },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' },
      ],
    },
  ])
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    title: 'AI Video Agent',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  Menu.setApplicationMenu(createMenu(mainWindow))
  void loadWhenReady(mainWindow)
}

function stopRuntime() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill()
  }
  runtimeLogStream?.end()
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.silly971.aivideoagent')
  if (process.platform === 'win32') {
    app.setPath('userData', path.join(app.getPath('appData'), 'AIVideoAgent'))
  }
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', stopRuntime)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
