#!/bin/bash

# Create Android SDK directory
mkdir -p $HOME/Android/Sdk

# Download Android command line tools
cd $HOME/Android/Sdk
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip

# Extract command line tools
unzip commandlinetools-linux-11076708_latest.zip

# Move to correct location
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true

# Clean up
rm commandlinetools-linux-11076708_latest.zip

echo "Command line tools installed successfully"
