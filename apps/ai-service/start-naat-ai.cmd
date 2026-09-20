@echo off
REM Starts the Naat AI service container persistently (no auto-shutdown).
REM Runs at user logon (Startup folder) and via self-healing scheduled task.

setlocal
set "SERVICE_DIR=D:\Projects\naat-collection\apps\ai-service"
set "DOCKER=C:\Program Files\Docker\Docker\resources\bin\docker.exe"
set "DOCKER_DESKTOP=C:\Program Files\Docker\Docker\Docker Desktop.exe"
set "LOG_DIR=%SERVICE_DIR%\logs"
set "LOG_FILE=%LOG_DIR%\naat-ai-startup.log"

cd /d "%SERVICE_DIR%"

REM === Wait for Docker daemon to be ready (start Docker Desktop if needed) ===
"%DOCKER%" info >nul 2>&1
if errorlevel 1 (
    echo [%date% %time%] Docker daemon not running, starting Docker Desktop...
    start "" "%DOCKER_DESKTOP%"

    set /a "WAITED=0"
    :wait_docker
    if !WAITED! geq 120 (
        echo [%date% %time%] ERROR: Docker not ready after 120s. Aborting.
        exit /b 1
    )
    timeout /t 5 /nobreak >nul
    set /a "WAITED+=5"
    "%DOCKER%" info >nul 2>&1
    if errorlevel 1 goto wait_docker
    echo [%date% %time%] Docker ready after !WAITED!s.
)

REM === Ensure the worker container is up (idempotent; restart policy keeps it alive) ===
echo [%date% %time%] Starting worker container...
"%DOCKER%" compose up -d 2>&1 > "%LOG_FILE%"
if errorlevel 1 (
    echo [%date% %time%] ERROR: docker compose up failed. See %LOG_FILE%
    exit /b 1
)
echo [%date% %time%] Worker container running (persistent).
endlocal