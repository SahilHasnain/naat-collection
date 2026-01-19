@echo off
echo ========================================
echo Full Android Debug Logging
echo ========================================
echo.

echo Clearing logs...
adb logcat -c
echo.

echo Starting full logging (this will be verbose)...
echo Look for FATAL EXCEPTION or stack traces
echo ========================================
echo.

adb logcat | findstr /i "ReactNative FATAL Exception AndroidRuntime com.sahilhasnain crash"
