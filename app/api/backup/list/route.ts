import { listBackups } from '@/lib/backup-scheduler'

// GET: List all backup files
export async function GET() {
  try {
    const backups = await listBackups()
    return Response.json({ success: true, backups })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
