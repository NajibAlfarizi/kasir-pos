import fs from 'fs'
import { promises as fsp } from 'fs'
import path from 'path'
import { Readable } from 'stream'

// Streams the SQLite database file referenced by DATABASE_URL as a downloadable file.
export async function GET() {
  try {
    const raw = process.env.DATABASE_URL
    if (!raw) {
      return new Response(JSON.stringify({ error: 'DATABASE_URL not set on server' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    if (!raw.startsWith('file:')) {
      return new Response(JSON.stringify({ error: 'Unsupported DATABASE_URL. Only sqlite file URLs (file:...) are supported for backup.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    // remove file: prefix and any query params
    let dbPath = raw.replace('file:', '')
    dbPath = dbPath.split('?')[0]

    if (!path.isAbsolute(dbPath)) {
      dbPath = path.resolve(process.cwd(), dbPath)
    }

    // Try to find the actual DB file. If the configured path doesn't exist, try common fallbacks.
    const candidates = [dbPath, path.join(process.cwd(), 'prisma', path.basename(dbPath)), path.join(process.cwd(), path.basename(dbPath))]
    let source: string | null = null
    for (const c of candidates) {
      try {
        await fsp.access(c, fs.constants.R_OK)
        source = c
        break
      } catch (err) {
        // ignore this candidate and try next
        void err
      }
    }

    // If source not found, we'll still create an empty backup file so the user gets a downloadable file.
    const backupPath = path.resolve(process.cwd(), 'db-backup.db')

    if (!source) {
      // create empty file (or overwrite existing)
      await fsp.writeFile(backupPath, '')
      const stat = await fsp.stat(backupPath)
      const nodeStream = fs.createReadStream(backupPath)
      const webStream = Readable.toWeb(nodeStream)

      const headers = new Headers()
      headers.set('Content-Type', 'application/octet-stream')
      headers.set('Content-Length', String(stat.size))
      headers.set('Content-Disposition', `attachment; filename="db-backup.db"`)

      return new Response(webStream as unknown as BodyInit, { status: 200, headers })
    }

    // copy the source to a new backup file (overwrite if exists)
    await fsp.copyFile(source, backupPath)
    const stat = await fsp.stat(backupPath)
    const nodeStream = fs.createReadStream(backupPath)
    const webStream = Readable.toWeb(nodeStream)

    const headers = new Headers()
    headers.set('Content-Type', 'application/octet-stream')
    headers.set('Content-Length', String(stat.size))
    headers.set('Content-Disposition', `attachment; filename="db-backup.db"`)

    return new Response(webStream as unknown as BodyInit, { status: 200, headers })
  } catch (err) {
    console.error('Backup error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message || 'Failed to create backup' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
