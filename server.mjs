import { createServer } from 'node:http'
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const root = dirname(fileURLToPath(import.meta.url))
const dbPath = resolve(process.env.IAT_DB_PATH ?? resolve(root, 'data/iat.sqlite'))
mkdirSync(dirname(dbPath), { recursive: true })

const db = new DatabaseSync(dbPath)
db.exec(`
  CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;
`)

const upsertDraft = db.prepare(`
  INSERT INTO drafts (id, data, updated_at)
  VALUES ('current', ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ON CONFLICT (id) DO UPDATE SET
    data = excluded.data,
    updated_at = excluded.updated_at
`)
const readDraft = db.prepare("SELECT data, updated_at FROM drafts WHERE id = 'current'")

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 2_000_000) throw Object.assign(new Error('El borrador supera el límite de 2 MB'), { status: 413 })
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw Object.assign(new Error('El cuerpo debe ser JSON válido'), { status: 400 }) }
}

async function handleApi(req, res) {
  if (req.method === 'GET') {
    const row = readDraft.get()
    return json(res, 200, row ? { draft: JSON.parse(row.data), updatedAt: row.updated_at } : { draft: null, updatedAt: null })
  }
  if (req.method === 'PUT') {
    const body = await readJson(req)
    if (!body?.draft || typeof body.draft !== 'object' || Array.isArray(body.draft)) {
      return json(res, 400, { error: 'Se esperaba un objeto draft' })
    }
    const data = JSON.stringify(body.draft)
    upsertDraft.run(data)
    const row = readDraft.get()
    return json(res, 200, { saved: true, updatedAt: row.updated_at })
  }
  res.setHeader('Allow', 'GET, PUT')
  return json(res, 405, { error: 'Método no permitido' })
}

const mime = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
}

function sendStatic(req, res) {
  let pathname
  try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname) }
  catch { res.writeHead(400).end('Solicitud no válida'); return }
  const dist = resolve(root, 'dist')
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1)
  let file = resolve(dist, relative)
  if (!file.startsWith(`${dist}${sep}`)) { res.writeHead(403).end('Prohibido'); return }
  if (!existsSync(file) || !statSync(file).isFile()) file = resolve(dist, 'index.html')
  if (!existsSync(file)) { res.writeHead(404).end('Primero ejecuta npm run build'); return }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}

const production = process.env.NODE_ENV === 'production'
let vite
const server = createServer((req, res) => {
  const pathname = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname
  if (pathname === '/api/draft') {
    void handleApi(req, res).catch((error) => json(res, error.status ?? 500, { error: error.message ?? 'Error interno' }))
    return
  }
  if (vite) {
    vite.middlewares(req, res, (error) => {
      if (error) { res.writeHead(500).end('Error de Vite'); return }
      res.writeHead(404).end('No encontrado')
    })
  } else if (production) {
    sendStatic(req, res)
  } else {
    res.writeHead(503).end('Vite no está disponible')
  }
})

if (!production) {
  const { createServer: createViteServer } = await import('vite')
  vite = await createViteServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'spa' })
}

const port = Number(process.env.PORT ?? 5173)
const host = process.env.HOST ?? '127.0.0.1'
server.listen(port, host, () => console.log(`IAT listo en http://${host}:${port} · SQLite: ${dbPath}`))

async function cerrar() {
  await vite?.close()
  db.close()
  server.close(() => process.exit(0))
}
process.on('SIGINT', () => void cerrar())
process.on('SIGTERM', () => void cerrar())
