@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required. Install Node.js, then run this file again.
  pause
  exit /b 1
)
echo NEO FIT - local preview
echo Open http://127.0.0.1:5173 in your browser.
echo Leave this window open. Cloud is configured separately.
node scripts/serve.mjs
pause
