const http = require('node:http')
const path = require('node:path')
const next = require('next')

const appDir = process.env.NEXT_APP_DIR || path.join(__dirname, '..')
const hostname = process.env.HOSTNAME || '127.0.0.1'
const port = Number.parseInt(process.env.PORT || '13000', 10) || 13000

process.env.NEXT_TELEMETRY_DISABLED = '1'

const app = next({
  dev: false,
  dir: appDir,
  hostname,
  port,
})
const handle = app.getRequestHandler()

app.prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      void handle(req, res)
    })

    server.listen(port, hostname, () => {
      console.log(`[desktop-next] ready on http://${hostname}:${port}`)
    })

    const close = () => {
      server.close(() => process.exit(0))
      setTimeout(() => process.exit(0), 3000).unref()
    }
    process.on('SIGTERM', close)
    process.on('SIGINT', close)
  })
  .catch((error) => {
    console.error('[desktop-next] failed to start')
    console.error(error)
    process.exit(1)
  })
