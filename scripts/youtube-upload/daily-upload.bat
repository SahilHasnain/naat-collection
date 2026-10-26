@echo off
cd /d D:\Projects\naat-collection
set "NODE_EXE="
for /f "delims=" %%N in ('where.exe node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE set "NODE_EXE=%LOCALAPPDATA%\Programs\node-v24.20.0-win-x64\node.exe"
if not exist "%NODE_EXE%" (
  echo Node.js executable not found: %NODE_EXE% >> scripts\youtube-upload\cron.log
  exit /b 1
)
set "UPLOAD_EXIT=0"
echo ================================================ >> scripts\youtube-upload\cron.log
echo [%date% %time%] Daily upload started >> scripts\youtube-upload\cron.log
echo --- 1 regular video --- >> scripts\youtube-upload\cron.log
set MAX_UPLOADS_PER_DAY=1
set FILTER_RADIO_ONLY=true
"%NODE_EXE%" scripts\youtube-upload\upload-to-youtube.js >> scripts\youtube-upload\cron.log 2>&1
if errorlevel 1 set "UPLOAD_EXIT=1"
echo --- 2 shorts --- >> scripts\youtube-upload\cron.log
set MAX_UPLOADS_PER_DAY=2
"%NODE_EXE%" scripts\youtube-upload\upload-shorts.js >> scripts\youtube-upload\cron.log 2>&1
if errorlevel 1 set "UPLOAD_EXIT=1"
echo [%date% %time%] Daily upload finished >> scripts\youtube-upload\cron.log
exit /b %UPLOAD_EXIT%
