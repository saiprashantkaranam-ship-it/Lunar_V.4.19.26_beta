@echo off
echo 🌙 Clearing Port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    if NOT "%%a"=="0" taskkill /f /pid %%a
)
echo ✅ Port 3000 is now free. You can start Lunar now!
pause
