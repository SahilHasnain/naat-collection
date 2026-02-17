#!/bin/bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

echo "Starting Android Emulator..."
emulator -avd Pixel_7_API_34 -no-snapshot-load &

echo "Waiting for emulator to boot..."
adb wait-for-device
sleep 10

echo "Emulator is ready!"
