@echo off
title Lunar AI Server
echo.
echo   🌙 Starting Lunar AI...
echo.
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" server.js
pause
