@echo off
cd /d D:\Projects\naat-collection
"C:\Program Files\nodejs\node.exe" "D:\Projects\naat-collection\scripts\regenerate-cut-audio.js" --loop --poll-interval=300 >> "D:\Projects\naat-collection\logs\regenerate-cut-audio.out" 2>&1