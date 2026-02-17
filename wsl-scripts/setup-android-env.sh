#!/bin/bash

# Add Android environment variables to .bashrc
cat >> ~/.bashrc << 'EOF'

# Android SDK Environment Variables
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
EOF

echo "Environment variables added to ~/.bashrc"
echo "Run 'source ~/.bashrc' to apply changes"
