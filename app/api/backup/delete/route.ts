import { NextRequest } from 'next/server'
import { deleteBackup } from '@/lib/backup-scheduler'

// DELETE: Delete a backup file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return Response.json({ success: false, error: 'Filename is required' }, { status: 400 })
    }

    const result = await deleteBackup(filename)
    
    if (result.success) {
      return Response.json({ success: true, message: 'Backup deleted' })
    } else {
      return Response.json({ success: false, error: result.error }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
