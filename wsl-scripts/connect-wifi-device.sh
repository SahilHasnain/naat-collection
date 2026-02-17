#!/bin/bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

echo "=== Android WiFi ADB Connection Setup ==="
echo ""
echo "First, connect your device via USB and run this script."
echo "After initial setup, you can disconnect USB and use WiFi."
echo ""

# Check if device is connected
echo "Checking for connected devices..."
adb devices

echo ""
echo "Starting ADB over TCP/IP on port 5555..."
adb tcpip 5555

echo ""
echo "Waiting for device to restart in TCP/IP mode..."
sleep 3

echo ""
echo "Now enter your device's IP address."
echo "To find it: Settings > About Phone > Status > IP Address"
echo "Or: Settings > WiFi > Current Network > IP Address"
echo ""
read -p "Enter device IP address: " DEVICE_IP

echo ""
echo "Connecting to $DEVICE_IP:5555..."
adb connect $DEVICE_IP:5555

echo ""
echo "Connected devices:"
adb devices

echo ""
echo "You can now disconnect the USB cable!"
echo "To reconnect later, just run: adb connect $DEVICE_IP:5555"
