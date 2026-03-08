import { NextRequest } from 'next/server'
import fs from 'fs'
import { promises as fsp } from 'fs'
import path from 'path'
import { Readable } from 'stream'

const BACKUPS_DIR = path.resolve(process.cwd(), 'backups')

// GET: Download a specific backup file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return Response.json({ error: 'Filename is required' }, { status: 400 })
    }

    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return Response.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const filePath = path.join(BACKUPS_DIR, filename)

    // Check if file exists
    try {
      await fsp.access(filePath, fs.constants.R_OK)
    } catch {
      return Response.json({ error: 'Backup file not found' }, { status: 404 })
    }

    const stat = await fsp.stat(filePath)
    const nodeStream = fs.createReadStream(filePath)
    const webStream = Readable.toWeb(nodeStream)

    const headers = new Headers()
    headers.set('Content-Type', 'application/octet-stream')
    headers.set('Content-Length', String(stat.size))
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)

    return new Response(webStream as unknown as BodyInit, { status: 200, headers })
  } catch (error) {
    console.error('Download error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ error: message || 'Failed to download backup' }, { status: 500 })
  }
}
