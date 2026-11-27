@echo off
setlocal
cd /d "%~dp0"
title Undercover
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Can Node.js 22.13+ va npm de chay Undercover.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
  call npm ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm run dev -- --port 5173 --strictPort --open
if errorlevel 1 pause
