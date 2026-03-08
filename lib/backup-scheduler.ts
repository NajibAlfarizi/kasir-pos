import * as cron from 'node-cron'
import fs from 'fs'
import { promises as fsp } from 'fs'
import path from 'path'

let scheduledTask: cron.ScheduledTask | null = null
const BACKUPS_DIR = path.resolve(process.cwd(), 'backups')

// Ensure backups directory exists
async function ensureBackupsDir() {
  try {
    await fsp.access(BACKUPS_DIR)
  } catch {
    await fsp.mkdir(BACKUPS_DIR, { recursive: true })
  }
}

// Get database path from DATABASE_URL
function getDatabasePath(): string | null {
  const raw = process.env.DATABASE_URL
  if (!raw || !raw.startsWith('file:')) {
    return null
  }

  let dbPath = raw.replace('file:', '')
  dbPath = dbPath.split('?')[0]

  if (!path.isAbsolute(dbPath)) {
    dbPath = path.resolve(process.cwd(), dbPath)
  }

  return dbPath
}

// Find the actual database file
async function findDatabaseFile(dbPath: string): Promise<string | null> {
  const candidates = [
    dbPath,
    path.join(process.cwd(), 'prisma', path.basename(dbPath)),
    path.join(process.cwd(), path.basename(dbPath))
  ]

  for (const candidate of candidates) {
    try {
      await fsp.access(candidate, fs.constants.R_OK)
      return candidate
    } catch {
      // Try next candidate
    }
  }

  return null
}

// Perform backup
export async function performBackup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    await ensureBackupsDir()

    const dbPath = getDatabasePath()
    if (!dbPath) {
      return { success: false, error: 'DATABASE_URL not configured or not a file URL' }
    }

    const sourceFile = await findDatabaseFile(dbPath)
    if (!sourceFile) {
      return { success: false, error: 'Database file not found' }
    }

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupFileName = `backup-${timestamp}.db`
    const backupPath = path.join(BACKUPS_DIR, backupFileName)

    // Copy database file
    await fsp.copyFile(sourceFile, backupPath)

    console.log(`✓ Backup created: ${backupFileName}`)
    return { success: true, filePath: backupPath }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Backup error:', message)
    return { success: false, error: message }
  }
}

// Clean old backups (keep only recent ones)
export async function cleanOldBackups(keepCount: number = 10): Promise<void> {
  try {
    await ensureBackupsDir()
    const files = await fsp.readdir(BACKUPS_DIR)
    
    const backupFiles = files
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(BACKUPS_DIR, f),
        time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time) // Sort by newest first

    // Delete old backups beyond keepCount
    if (backupFiles.length > keepCount) {
      const filesToDelete = backupFiles.slice(keepCount)
      for (const file of filesToDelete) {
        await fsp.unlink(file.path)
        console.log(`✓ Deleted old backup: ${file.name}`)
      }
    }
  } catch (error) {
    console.error('Error cleaning old backups:', error)
  }
}

// Start automatic backup scheduler
export function startBackupScheduler(cronExpression: string = '0 2 * * *'): boolean {
  try {
    // Stop existing task if any
    stopBackupScheduler()

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      console.error('Invalid cron expression:', cronExpression)
      return false
    }

    // Schedule backup task
    scheduledTask = cron.schedule(cronExpression, async () => {
      console.log('Running scheduled backup...')
      const result = await performBackup()
      
      if (result.success) {
        // Clean old backups after successful backup
        await cleanOldBackups(10)
      } else {
        console.error('Scheduled backup failed:', result.error)
      }
    })

    console.log(`✓ Backup scheduler started with cron: ${cronExpression}`)
    return true
  } catch (error) {
    console.error('Error starting backup scheduler:', error)
    return false
  }
}

// Stop backup scheduler
export function stopBackupScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
    console.log('✓ Backup scheduler stopped')
  }
}

// Get scheduler status
export function getSchedulerStatus(): { isRunning: boolean } {
  return { isRunning: scheduledTask !== null }
}

// List all backup files
export async function listBackups(): Promise<Array<{ name: string; size: number; date: number }>> {
  try {
    await ensureBackupsDir()
    const files = await fsp.readdir(BACKUPS_DIR)
    
    const backups = await Promise.all(
      files
        .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
        .map(async (f) => {
          const filePath = path.join(BACKUPS_DIR, f)
          const stats = await fsp.stat(filePath)
          return {
            name: f,
            size: stats.size,
            date: stats.mtime.getTime()
          }
        })
    )

    return backups.sort((a, b) => b.date - a.date)
  } catch (error) {
    console.error('Error listing backups:', error)
    return []
  }
}

// Delete a backup file
export async function deleteBackup(filename: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Security: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return { success: false, error: 'Invalid filename' }
    }

    const filePath = path.join(BACKUPS_DIR, filename)
    await fsp.unlink(filePath)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

// Restore backup
export async function restoreBackup(filename: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Security: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return { success: false, error: 'Invalid filename' }
    }

    const backupPath = path.join(BACKUPS_DIR, filename)
    
    // Check if backup file exists
    try {
      await fsp.access(backupPath, fs.constants.R_OK)
    } catch {
      return { success: false, error: 'Backup file not found' }
    }

    const dbPath = getDatabasePath()
    if (!dbPath) {
      return { success: false, error: 'DATABASE_URL not configured' }
    }

    const targetFile = await findDatabaseFile(dbPath)
    if (!targetFile) {
      // If target doesn't exist, use the dbPath
      await fsp.copyFile(backupPath, dbPath)
    } else {
      // Backup current database before restore
      const currentBackup = path.join(BACKUPS_DIR, `pre-restore-${Date.now()}.db`)
      await fsp.copyFile(targetFile, currentBackup)
      
      // Restore from backup
      await fsp.copyFile(backupPath, targetFile)
    }

    console.log(`✓ Database restored from: ${filename}`)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Restore error:', message)
    return { success: false, error: message }
  }
}
