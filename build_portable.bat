@echo off
title Lunar AI - Building Portable Package
color 0D

echo.
echo  =============================================
echo   🌙  LUNAR AI — Portable Package Builder
echo  =============================================
echo.

set "SRC=%~dp0"
set "OUT=%USERPROFILE%\Downloads\lunar-portable"

:: Clean old build in Downloads
if exist "%OUT%" (
    echo  [!] Removing old portable folder from Downloads...
    rmdir /s /q "%OUT%"
)

echo  [1/6] Creating folder structure in Downloads...
mkdir "%OUT%"
mkdir "%OUT%\ollama"
mkdir "%OUT%\models"
mkdir "%OUT%\app"
mkdir "%OUT%\app\public"
mkdir "%OUT%\app\services"

:: ── Copy Lunar AI app ────────────────────────────────
echo  [2/6] Copying Lunar AI files...
robocopy "%SRC%public" "%OUT%\app\public" /E /NFL /NDL /NJH /NJS >nul
robocopy "%SRC%services" "%OUT%\app\services" /E /NFL /NDL /NJH /NJS >nul
copy "%SRC%server.js" "%OUT%\app\" >nul
copy "%SRC%package.json" "%OUT%\app\" >nul
if exist "%SRC%package-lock.json" copy "%SRC%package-lock.json" "%OUT%\app\" >nul 2>nul
if exist "%SRC%lunar_memory.json" copy "%SRC%lunar_memory.json" "%OUT%\app\" >nul 2>nul
if exist "%SRC%lunar_api_keys.json" copy "%SRC%lunar_api_keys.json" "%OUT%\app\" >nul 2>nul

:: Copy node_modules
if exist "%SRC%node_modules" (
    echo  [2b] Copying node_modules - This takes a while, please wait...
    robocopy "%SRC%node_modules" "%OUT%\app\node_modules" /E /NFL /NDL /NJH /NJS /R:1 /W:1
    echo       Done copying modules!
)

:: ── Find and copy Ollama ─────────────────────────────
echo  [3/6] Looking for Ollama binary...

set "OLLAMA_FOUND=0"

:: Check AppData location (default Windows install)
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
    echo       Found at AppData\Local\Programs\Ollama
    copy "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" "%OUT%\ollama\" >nul
    if exist "%LOCALAPPDATA%\Programs\Ollama\lib" (
        robocopy "%LOCALAPPDATA%\Programs\Ollama\lib" "%OUT%\ollama\lib" /E /NFL /NDL /NJH /NJS >nul
    )
    set "OLLAMA_FOUND=1"
)

:: Try PATH
if "%OLLAMA_FOUND%"=="0" (
    where ollama >nul 2>&1
    if not errorlevel 1 (
        for /f "tokens=*" %%i in ('where ollama') do (
            echo       Found at %%i
            copy "%%i" "%OUT%\ollama\" >nul
            set "OLLAMA_FOUND=1"
        )
    )
)

if "%OLLAMA_FOUND%"=="0" (
    echo  [!] WARNING: Ollama binary not found.
    echo      Target laptop will need Ollama installed.
    echo      Download: https://ollama.com/download
)

:: ── Copy downloaded models ───────────────────────────
echo  [4/6] Copying Ollama models...

set "OLLAMA_MODELS=%USERPROFILE%\.ollama\models"
if exist "%OLLAMA_MODELS%" (
    echo       Found models at %OLLAMA_MODELS%
    robocopy "%OLLAMA_MODELS%" "%OUT%\models" /E /NFL /NDL /NJH /NJS /R:1 /W:1
    echo       All models copied!
) else (
    echo  [!] No models folder found. Models need download on target.
)

:: ── Copy startup scripts ─────────────────────────────
echo  [5/6] Creating startup scripts...
copy "%SRC%portable_start.bat" "%OUT%\START_LUNAR.bat" >nul
copy "%SRC%portable_setup.bat" "%OUT%\SETUP_FIRST_TIME.bat" >nul

:: ── Create README ────────────────────────────────────
echo  [6/6] Creating README...
(
echo ============================================================
echo  🌙 LUNAR AI — PORTABLE EDITION
echo ============================================================
echo.
echo  🔴 CRITICAL REQUIREMENT:
echo  You MUST install Node.js on this laptop before starting.
echo  Download here: https://nodejs.org - Choose LTS version
echo.
echo  ------------------------------------------------------------
echo  🚀 HOW TO RUN:
echo  ------------------------------------------------------------
echo  1. Run 'SETUP_FIRST_TIME.bat' once (This checks everything)
echo  2. Run 'START_LUNAR.bat' every time you want to use it
echo  3. Open Browser: http://localhost:3000
echo.
echo  📱 FOR MOBILE ACCESS:
echo  Connect phone to same WiFi and go to the IP address 
echo  shown in the black terminal window after starting.
echo.
echo  ------------------------------------------------------------
echo  📁 FOLDER CONTENTS:
echo  ------------------------------------------------------------
echo  - ollama/  : The AI engine (included!)
echo  - models/  : Your AI brains (DeepSeek/SmolLM2 etc.)
echo  - app/     : The Lunar software code
echo.
echo  Everything is local. No tokens. No internet needed.
) > "%OUT%\README.txt"

:: ── Done ─────────────────────────────────────────────
echo.
echo  =============================================
echo   [OK] PORTABLE PACKAGE BUILT!
echo  =============================================
echo.
echo   Location: %OUT%
echo.
echo   Size:
for /f "tokens=3" %%s in ('dir "%OUT%" /s /-c ^| findstr "File(s)"') do echo     %%s bytes total

echo.
echo   To deploy on another laptop:
echo     1. Copy "lunar-portable" folder (USB/drive)
echo     2. Run SETUP_FIRST_TIME.bat (once)
echo     3. Run START_LUNAR.bat (every time)
echo.
echo   Target laptop only needs Node.js installed.
echo  =============================================
echo.
pause
