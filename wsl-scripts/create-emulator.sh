#!/bin/bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin

# Create an AVD (Android Virtual Device)
echo "Creating Android Virtual Device..."
avdmanager create avd -n Pixel_7_API_34 -k "system-images;android-34;google_apis;x86_64" -d "pixel_7" --force

echo "AVD created successfully!"
echo "To start the emulator, run: emulator -avd Pixel_7_API_34"
