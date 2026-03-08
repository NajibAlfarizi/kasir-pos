// Next.js instrumentation - runs on server startup
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeBackup } = await import('./lib/backup-init')
    initializeBackup()
  }
}
