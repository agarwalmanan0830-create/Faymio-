@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Faymio needs Node.js 22.12 or later.
  echo Install the current Node.js LTS from https://nodejs.org, then open this file again.
  echo.
  pause
  exit /b 1
)
node scripts\demo.mjs
set "FAYMIO_EXIT=%ERRORLEVEL%"
if not "%FAYMIO_EXIT%"=="0" if not "%FAYMIO_EXIT%"=="130" pause
exit /b %FAYMIO_EXIT%
