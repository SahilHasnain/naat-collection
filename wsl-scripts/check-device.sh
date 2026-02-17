#!/bin/bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

echo "Checking connected devices..."
adb devices -l
