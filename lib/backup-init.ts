// Initialize backup scheduler on server startup
import { startBackupScheduler, performBackup, stopBackupScheduler, listBackups } from './backup-scheduler'
import fs from 'fs'

let initialized = false

// Check if backup already exists today
async function hasBackupToday(): Promise<boolean> {
  try {
    const backups = await listBackups()
    if (backups.length === 0) return false

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const latestBackup = backups[0] // Already sorted by date descending
    const backupDate = new Date(latestBackup.date).toISOString().split('T')[0]
    
    return backupDate === today
  } catch {
    return false
  }
}

// Backup on startup
async function backupOnStartup() {
  const hasBackup = await hasBackupToday()
  
  if (!hasBackup) {
    console.log('🔄 Performing startup backup (no backup today)...')
    const result = await performBackup()
    
    if (result.success) {
      console.log('✓ Startup backup completed successfully')
    } else {
      console.error('✗ Startup backup failed:', result.error)
    }
  } else {
    console.log('ℹ Backup already exists for today, skipping startup backup')
  }
}

// Backup on shutdown
async function backupOnShutdown() {
  console.log('\n🔄 Server shutting down, performing final backup...')
  const result = await performBackup()
  
  if (result.success) {
    console.log('✓ Shutdown backup completed successfully')
  } else {
    console.error('✗ Shutdown backup failed:', result.error)
  }
  
  // Stop scheduler
  stopBackupScheduler()
}

// Setup graceful shutdown handlers
function setupShutdownHandlers() {
  const shutdownHandler = async (signal: string) => {
    console.log(`\n⚠️ Received ${signal}, initiating graceful shutdown...`)
    
    try {
      await backupOnShutdown()
      console.log('✓ Graceful shutdown completed')
      process.exit(0)
    } catch (error) {
      console.error('✗ Error during shutdown:', error)
      process.exit(1)
    }
  }

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'))
  process.on('SIGINT', () => shutdownHandler('SIGINT'))
  
  // Handle Ctrl+C on Windows
  if (process.platform === 'win32') {
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    rl.on('SIGINT', () => {
      process.emit('SIGINT' as any)
    })
  }
}

export function initializeBackup() {
  if (initialized) return
  initialized = true

  console.log('🚀 Initializing backup system...')

  // Setup graceful shutdown handlers
  setupShutdownHandlers()

  // Perform startup backup
  backupOnStartup().catch(err => {
    console.error('Startup backup error:', err)
  })

  // Check environment variable for auto-backup configuration
  const autoBackup = process.env.AUTO_BACKUP_ENABLED === 'true'
  const cronSchedule = process.env.AUTO_BACKUP_CRON || '0 2 * * *' // Default: 2 AM daily

  if (autoBackup) {
    console.log('🔄 Starting scheduled backup...')
    const started = startBackupScheduler(cronSchedule)
    
    if (started) {
      console.log(`✓ Auto-backup enabled with schedule: ${cronSchedule}`)
    } else {
      console.error('✗ Failed to start auto-backup scheduler')
    }
  } else {
    console.log('ℹ Auto-backup is disabled. Enable it in Settings or set AUTO_BACKUP_ENABLED=true in .env')
  }
}
