@echo off
echo Creating Lunar AI startup shortcut...
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SCRIPT=%~dp0start_lunar.bat"

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP%\LunarAI.lnk'); $s.TargetPath = '%SCRIPT%'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 7; $s.Description = 'Lunar AI Assistant'; $s.Save()"

echo.
echo ✅ Done! Lunar AI will now auto-start when your laptop boots.
echo    (It runs minimized in the background)
echo.
pause
