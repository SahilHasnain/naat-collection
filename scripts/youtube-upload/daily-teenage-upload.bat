@echo off
cd /d D:\Projects\naat-collection
set "NODE_EXE="
for /f "delims=" %%N in ('where.exe node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE set "NODE_EXE=%LOCALAPPDATA%\Programs\node-v24.20.0-win-x64\node.exe"
if not exist "%NODE_EXE%" (
  echo Node.js executable not found: %NODE_EXE% >> scripts\youtube-upload\teenage-cron.log
  exit /b 1
)
set "UPLOAD_EXIT=0"
echo ================================================ >> scripts\youtube-upload\teenage-cron.log
echo [%date% %time%] Teenage-voice upload started >> scripts\youtube-upload\teenage-cron.log
echo --- 1 regular teenage-voice video --- >> scripts\youtube-upload\teenage-cron.log
set TEENAGE_MAX_UPLOADS_PER_DAY=1
"%NODE_EXE%" scripts\youtube-upload\upload-teenage-to-youtube.js >> scripts\youtube-upload\teenage-cron.log 2>&1
if errorlevel 1 set "UPLOAD_EXIT=1"
echo --- 2 teenage-voice Shorts (start/end clips) --- >> scripts\youtube-upload\teenage-cron.log
set TEENAGE_SHORTS_MAX_UPLOADS_PER_DAY=2
"%NODE_EXE%" scripts\youtube-upload\upload-teenage-to-youtube.js --shorts >> scripts\youtube-upload\teenage-cron.log 2>&1
if errorlevel 1 set "UPLOAD_EXIT=1"
echo [%date% %time%] Teenage-voice upload finished (exit %UPLOAD_EXIT%) >> scripts\youtube-upload\teenage-cron.log
exit /b %UPLOAD_EXIT%
