@echo off
REM Daily Instagram Reel uploader (1 PM)
cd /d "D:\Projects\naat-collection"
"C:\Program Files\nodejs\node.exe" scripts\youtube-upload\instagram-bot.js >> scripts\youtube-upload\instagram-bot.log 2>&1