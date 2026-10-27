@echo off
cd /d D:\Projects\naat-collection
"C:\Users\MD SAHIL HASNAIN\AppData\Local\Author Software\nvm\.nodejs\node.exe" "D:\Projects\naat-collection\scripts\ai-service\regenerate-cut-audio.js" --loop --poll-interval=300 >> "D:\Projects\naat-collection\logs\regenerate-cut-audio.out" 2>&1
