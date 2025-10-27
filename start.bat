@echo off
REM Start script for Kasir Minimarket (Windows)
REM Location: project root (d:\Project\kasir-chicha\kasir-minimarket)

REM Ensure script runs from the project directory where the batch file resides
cd /d "%~dp0"

REM Install dependencies if node_modules is missing
if not exist node_modules (
  echo Installing dependencies (npm install)...
  npm install || (
    echo Failed to install dependencies. Please run npm install manually and re-run this script.
    pause
    exit /b 1
  )
)

REM Provide a sensible default DATABASE_URL for local development if not set
if "%DATABASE_URL%"=="" (
  echo Setting DATABASE_URL to local sqlite dev database
  set "DATABASE_URL=file:./prisma/dev.db"
)

echo Starting Next.js dev server (npm run dev)...
REM Use cmd to run npm script (keeps output visible)
npm run dev

exit /b 0
