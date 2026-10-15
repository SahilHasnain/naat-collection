@echo off
cd /d D:\Projects\naat-collection
echo ================================================ >> scripts\youtube-upload\teenage-cron.log
echo [%date% %time%] Teenage-voice upload started >> scripts\youtube-upload\teenage-cron.log
echo --- 1 regular teenage-voice video --- >> scripts\youtube-upload\teenage-cron.log
set TEENAGE_MAX_UPLOADS_PER_DAY=1
"C:\Program Files\nodejs\node.exe" scripts\youtube-upload\upload-teenage-to-youtube.js >> scripts\youtube-upload\teenage-cron.log 2>&1
echo --- 2 teenage-voice Shorts (start/end clips) --- >> scripts\youtube-upload\teenage-cron.log
set TEENAGE_SHORTS_MAX_UPLOADS_PER_DAY=2
"C:\Program Files\nodejs\node.exe" scripts\youtube-upload\upload-teenage-to-youtube.js --shorts >> scripts\youtube-upload\teenage-cron.log 2>&1
echo [%date% %time%] Teenage-voice upload finished (exit %ERRORLEVEL%) >> scripts\youtube-upload\teenage-cron.log
