@echo off
echo ========================================
echo Android Debug Helper
echo ========================================
echo.

echo Step 1: Clearing ADB logs...
adb logcat -c
echo Done!
echo.

echo Step 2: Starting filtered error logging...
echo.
echo IMPORTANT: Keep this window open!
echo Open your app now and watch for errors below:
echo ========================================
echo.

adb logcat *:E | findstr /i "ReactNative AndroidRuntime FATAL Exception Error com.sahilhasnain"
