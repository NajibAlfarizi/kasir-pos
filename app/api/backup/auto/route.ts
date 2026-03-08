import { NextRequest } from 'next/server'
import { performBackup, startBackupScheduler, stopBackupScheduler, getSchedulerStatus } from '@/lib/backup-scheduler'

// GET: Get auto-backup status
export async function GET() {
  try {
    const status = getSchedulerStatus()
    return Response.json({ success: true, ...status })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

// POST: Start/stop auto-backup or trigger manual backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, cronExpression } = body

    if (action === 'start') {
      const cron = cronExpression || '0 2 * * *' // Default: 2 AM daily
      const started = startBackupScheduler(cron)
      
      if (started) {
        return Response.json({ success: true, message: 'Auto-backup started', cronExpression: cron })
      } else {
        return Response.json({ success: false, error: 'Failed to start scheduler' }, { status: 400 })
      }
    }

    if (action === 'stop') {
      stopBackupScheduler()
      return Response.json({ success: true, message: 'Auto-backup stopped' })
    }

    if (action === 'backup') {
      const result = await performBackup()
      return Response.json(result)
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
