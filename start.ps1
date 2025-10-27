<#
  start.ps1 - Start script for Kasir Minimarket (PowerShell)

  - Runs from the script directory so it's portable when the folder is moved.
  - Installs `npm install` if `node_modules` is missing.
  - Sets a session DATABASE_URL fallback to `file:./prisma/dev.db` if not defined.
  - Optionally runs `npx prisma db push` if you set -PushDb switch.
  - Runs `npm run dev` and keeps output visible.

  Usage:
    .\start.ps1                # default behavior
    .\start.ps1 -NoInstall     # don't run npm install
    .\start.ps1 -PushDb        # run `npx prisma db push` before starting (useful when schema changed)
    To run from PowerShell with bypass execution policy:
      powershell -ExecutionPolicy Bypass -File .\start.ps1
#>

[CmdletBinding()]
param(
  [switch]$NoInstall,
  [switch]$PushDb
)

try {
  # Ensure script runs from the directory where the script is located
  Set-Location -Path $PSScriptRoot
} catch {
  Write-Host "Warning: failed to set location to script folder: $_" -ForegroundColor Yellow
}

Write-Host "Project folder: $(Get-Location)" -ForegroundColor Cyan

if (-not $NoInstall) {
  if (-not (Test-Path -Path "node_modules")) {
    Write-Host "node_modules not found — running npm install..." -ForegroundColor Green
    $proc = Start-Process -FilePath npm -ArgumentList 'install' -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -ne 0) {
      Write-Host "npm install failed (exit code $($proc.ExitCode)). Please run 'npm install' manually." -ForegroundColor Red
      exit $proc.ExitCode
    }
  } else {
    Write-Host "node_modules found — skipping install." -ForegroundColor DarkGray
  }
} else {
  Write-Host "Skipping npm install (NoInstall specified)." -ForegroundColor DarkGray
}

# Set DATABASE_URL fallback for this session only if not present
if (-not $env:DATABASE_URL -or [string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  $env:DATABASE_URL = "file:./prisma/dev.db"
  Write-Host "DATABASE_URL not set; using fallback: $env:DATABASE_URL" -ForegroundColor Yellow
} else {
  Write-Host "DATABASE_URL is already set." -ForegroundColor DarkGray
}

if ($PushDb) {
  Write-Host "Running 'npx prisma db push' to sync schema to DB..." -ForegroundColor Green
  $p = Start-Process -FilePath npx -ArgumentList 'prisma','db','push' -NoNewWindow -Wait -PassThru
  if ($p.ExitCode -ne 0) {
    Write-Host "prisma db push failed (exit code $($p.ExitCode)). Aborting." -ForegroundColor Red
    exit $p.ExitCode
  }
}

Write-Host "Starting dev server: npm run dev" -ForegroundColor Green
# Start dev server and stream output into this window
& npm run dev

Write-Host "Dev server exited." -ForegroundColor Cyan
