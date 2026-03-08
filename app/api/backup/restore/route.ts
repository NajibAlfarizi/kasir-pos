import { NextRequest } from 'next/server'
import { restoreBackup } from '@/lib/backup-scheduler'

// POST: Restore from a backup file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename } = body

    if (!filename) {
      return Response.json({ success: false, error: 'Filename is required' }, { status: 400 })
    }

    const result = await restoreBackup(filename)
    
    if (result.success) {
      return Response.json({ success: true, message: 'Database restored successfully' })
    } else {
      return Response.json({ success: false, error: result.error }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
