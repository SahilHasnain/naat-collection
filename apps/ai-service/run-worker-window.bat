@echo off
REM Runs the AI classifier worker for a fixed window each day.
REM Task Scheduler launches this at 14:00 daily; it runs app.py
REM for 2 hours then terminates it.

setlocal
set "SERVICE_DIR=D:\Projects\naat-collection\apps\ai-service"
set "WINDOW_MINUTES=120"

cd /d "%SERVICE_DIR%"

REM Start the worker (app.py loads .env from this dir, spawns worker_loop)
start "naat-ai-worker" /min cmd /c "python app.py"

REM Let it run for the window (120 min = 7200 seconds)
echo Worker started at %date% %time%. Running for %WINDOW_MINUTES% minutes...
timeout /t 7200 /nobreak >nul

echo Stopping worker at %date% %time%...
taskkill /fi "WINDOWTITLE eq naat-ai-worker*" /t /f >nul 2>nul

endlocal