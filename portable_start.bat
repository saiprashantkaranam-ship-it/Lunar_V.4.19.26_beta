@echo off
title Lunar AI - Portable Starter
color 0D

echo.
echo  =============================================
echo   🌙  LUNAR AI — Portable Edition
echo  =============================================
echo.

:: Set Ollama to use local models folder
set "OLLAMA_MODELS=%~dp0models"

:: Start Ollama in background if we have the binary
if exist "%~dp0ollama\ollama.exe" (
    echo  [1/3] Starting Ollama from portable folder...
    set "PATH=%~dp0ollama;%PATH%"
    start /B "" "%~dp0ollama\ollama.exe" serve >nul 2>&1
) else (
    echo  [1/3] Using system Ollama... make sure 'ollama serve' is running.
)

:: Wait for Ollama to be ready
echo  [2/3] Waiting for Ollama to start...
timeout /t 4 /noq >nul

:: Start Lunar
echo  [3/3] Starting Lunar AI server...
echo.

cd /d "%~dp0app"

if not exist "node_modules" (
    echo  Installing dependencies first...
    npm install --production
    echo.
)

node server.js

pause
