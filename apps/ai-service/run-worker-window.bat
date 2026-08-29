@echo off
REM Runs the AI classifier worker for a fixed window each day via Docker.
REM Task Scheduler launches this at 14:00 daily; it starts the container
REM for 2 hours then stops it.
REM
REM If Docker Desktop is not running, it starts it and waits up to 90s.

setlocal enabledelayedexpansion
set "SERVICE_DIR=D:\Projects\naat-collection\apps\ai-service"
set "DOCKER=C:\Program Files\Docker\Docker\resources\bin\docker.exe"
set "DOCKER_DESKTOP=C:\Program Files\Docker\Docker\Docker Desktop.exe"
set "LOG_DIR=%SERVICE_DIR%\logs"
set "WINDOW_SECONDS=7200"

cd /d "%SERVICE_DIR%"

REM === Wait for Docker daemon to be ready ===
"%DOCKER%" info >nul 2>&1
if errorlevel 1 (
    echo [%date% %time%] Docker daemon not running, starting Docker Desktop...
    start "" "%DOCKER_DESKTOP%"

    set /a "WAITED=0"
    :wait_docker
    if !WAITED! geq 90 (
        echo [%date% %time%] ERROR: Docker not ready after 90s. Aborting.
        exit /b 1
    )
    timeout /t 5 /nobreak >nul
    set /a "WAITED+=5"
    "%DOCKER%" info >nul 2>&1
    if errorlevel 1 goto wait_docker
    echo [%date% %time%] Docker ready after !WAITED!s.
)

REM === Start the worker container ===
echo [%date% %time%] Starting worker container...
"%DOCKER%" compose up -d 2>&1
if errorlevel 1 (
    echo [%date% %time%] ERROR: docker compose up failed.
    exit /b 1
)

REM === Run for the window ===
echo [%date% %time%] Worker running for %WINDOW_SECONDS%s...
timeout /t %WINDOW_SECONDS% /nobreak >nul

REM === Stop the worker ===
echo [%date% %time%] Stopping worker...
"%DOCKER%" compose down 2>&1

echo [%date% %time%] Done.
endlocal
