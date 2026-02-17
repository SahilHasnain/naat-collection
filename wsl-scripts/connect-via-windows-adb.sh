#!/bin/bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Get Windows host IP
WINDOWS_IP=$(ip route | grep default | awk '{print $3}')

echo "Windows host IP: $WINDOWS_IP"
echo "Connecting to Windows ADB server..."

# Kill any existing ADB server in WSL
adb kill-server 2>/dev/null

# Forward to Windows ADB
export ADB_SERVER_SOCKET=tcp:$WINDOWS_IP:5037

echo "Checking devices via Windows ADB..."
adb devices

echo ""
echo "If device shows up, you're ready to run the app!"
