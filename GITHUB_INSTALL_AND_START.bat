@echo off
title 🌙 LUNAR AI — Automatic Setup & Start
color 0D

echo.
echo  ============================================================
2: echo   🌙  LUNAR AI — Zero-to-Hero Setup
3: echo  ============================================================
4: echo.
5: echo  This script will check your laptop and download everything
6: echo  needed to run Lunar AI locally.
7: echo.
8: 
9: :: 1. Check for Node.js
10: echo  [1/5] Checking for Node.js...
11: node -v >nul 2>&1
12: if %errorlevel% neq 0 (
13:     echo  [!] Node.js is NOT installed.
14:     echo      Opening download page... please install the LTS version.
15:     start https://nodejs.org
16:     echo.
17:     echo  AFTER installing Node.js, please run this script again.
18:     pause
19:     exit
20: )
21: echo      Found Node.js: OK
22: 
23: :: 2. Check for Ollama
24: echo  [2/5] Checking for Ollama...
25: where ollama >nul 2>&1
26: if %errorlevel% neq 0 (
27:     echo      Ollama not found. Downloading installer...
28:     powershell -Command "Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile 'OllamaSetup.exe'"
29:     echo      Starting Ollama installation... 
30:     echo      [ACTION REQUIRED] Please click 'Install' in the window that just opened.
31:     start /wait OllamaSetup.exe
32:     echo      Cleaning up installer...
33:     del OllamaSetup.exe
34:     echo      Waiting for Ollama service to wake up...
35:     timeout /t 5 >nul
36: ) else (
37:     echo      Found Ollama: OK
38: )
39: 
40: :: 3. Install Dependencies
41: echo  [3/5] Installing Lunar software dependencies...
42: call npm install --production
43: 
44: :: 4. Pull AI Model
45: echo  [4/5] Pulling AI Model (smollm2:135m)...
46: echo      (This might take a minute depending on your internet)
47: ollama pull smollm2:135m
48: 
49: :: 5. Start Lunar
50: echo  [5/5] Everything is ready! Starting Lunar AI...
51: echo.
52: echo  ============================================================
53: echo   🚀 LUNAR IS RUNNING
54: echo   🌐 Open: http://localhost:3000
55: echo  ============================================================
56: echo.
57: 
58: node server.js
59: 
60: pause
