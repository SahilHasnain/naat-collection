@echo off
cd /d D:\Projects\naat-collection
echo ================================================ >> scripts\youtube-upload\cron.log
echo [%date% %time%] Daily upload started >> scripts\youtube-upload\cron.log
echo --- 1 regular video --- >> scripts\youtube-upload\cron.log
set MAX_UPLOADS_PER_DAY=1
"C:\Program Files\nodejs\node.exe" scripts\youtube-upload\upload-to-youtube.js >> scripts\youtube-upload\cron.log 2>&1
echo --- 2 shorts --- >> scripts\youtube-upload\cron.log
set MAX_UPLOADS_PER_DAY=2
"C:\Program Files\nodejs\node.exe" scripts\youtube-upload\upload-shorts.js >> scripts\youtube-upload\cron.log 2>&1
echo [%date% %time%] Daily upload finished >> scripts\youtube-upload\cron.log
