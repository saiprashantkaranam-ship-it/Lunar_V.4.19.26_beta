@echo off
title Lunar AI - First Time Setup
color 0D

echo.
echo  =============================================
echo   🌙  LUNAR AI — First Time Setup
echo  =============================================
echo.

:: Check Node.js
echo  [1/4] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [X] Node.js NOT FOUND!
    echo.
    echo      You need Node.js to run Lunar.
    echo      Download LTS from: https://nodejs.org
    echo      Install it, restart your PC, run this again.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo       Node.js %%v found [OK]

:: Check Ollama
echo  [2/4] Checking Ollama...
set "OLLAMA_MODELS=%~dp0models"

if exist "%~dp0ollama\ollama.exe" (
    echo       Ollama binary found in portable folder [OK]
    set "PATH=%~dp0ollama;%PATH%"
) else (
    where ollama >nul 2>&1
    if errorlevel 1 (
        echo.
        echo  [X] Ollama NOT FOUND!
        echo.
        echo      Download from: https://ollama.com/download
        echo      Install it, then run this setup again.
        echo.
        pause
        exit /b 1
    )
    echo       Ollama found in system PATH [OK]
)

:: Install dependencies
echo  [3/4] Installing Node.js dependencies...
cd /d "%~dp0app"
npm install --production
echo       Dependencies installed [OK]

:: Check models
echo  [4/4] Checking AI models...
if exist "%~dp0models\manifests" (
    echo       Pre-downloaded models found [OK]
) else (
    echo       No models found. Downloading smollm2:135m (~270MB)...
    echo.
    
    :: Start Ollama first
    if exist "%~dp0ollama\ollama.exe" (
        start /B "" "%~dp0ollama\ollama.exe" serve >nul 2>&1
    )
    timeout /t 4 /noq >nul
    
    ollama pull smollm2:135m
    echo.
    echo       Model downloaded [OK]
)

echo.
echo  =============================================
echo   [OK] Setup complete!
echo.
echo   Now double-click START_LUNAR.bat to run.
echo  =============================================
echo.
pause
