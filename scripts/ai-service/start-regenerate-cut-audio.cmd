@echo off
cd /d D:\Projects\naat-collection
"C:\Users\MDSAHI~1\AppData\Local\Programs\node-v24.20.0-win-x64\node.exe" "D:\Projects\naat-collection\scripts\ai-service\regenerate-cut-audio.js" --loop --poll-interval=300 >> "D:\Projects\naat-collection\logs\regenerate-cut-audio.out" 2>&1
