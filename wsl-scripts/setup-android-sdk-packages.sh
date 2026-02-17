#!/bin/bash

export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# Accept licenses
yes | sdkmanager --licenses

# Install essential SDK packages
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" "emulator" "system-images;android-34;google_apis;x86_64"

echo "Android SDK packages installed successfully"
