@echo off
REM Quick setup script for mobile control and clipboard sync

echo ========================================
echo Mobile Control Setup
echo ========================================
echo.

REM Check if scoop is installed
where scoop >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Scoop not found. Install from: https://scoop.sh
    echo.
    echo Run this in PowerShell:
    echo   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    echo   Invoke-RestMethod -Uri https://get.scoop.sh ^| Invoke-Expression
    echo.
    pause
    exit /b 1
)

echo [+] Scoop found!
echo.

REM Install scrcpy
echo Installing scrcpy...
scoop install scrcpy
echo.

REM Install ADB
echo Installing ADB...
scoop install adb
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Enable USB Debugging on your phone
echo    - Settings ^> About Phone
echo    - Tap "Build Number" 7 times
echo    - Settings ^> Developer Options
echo    - Enable "USB Debugging"
echo.
echo 2. Connect your phone via USB
echo.
echo 3. Run: npm run mobile:control
echo.
echo 4. For clipboard sync, install on phone:
echo    - Install Termux from F-Droid
echo    - Run: pkg install termux-api
echo    - Install Termux:API app
echo.
echo 5. Then run: npm run clipboard:watch
echo.
echo See docs/MOBILE-CONTROL-SETUP.md for full guide
echo.
pause
