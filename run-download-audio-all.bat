@echo off
cd /d "%~dp0"
node scripts\download-audio-all-brands.js %*
exit /b %ERRORLEVEL%
