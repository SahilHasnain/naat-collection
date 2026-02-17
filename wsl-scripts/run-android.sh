#!/bin/bash
cd '/mnt/c/Users/MD SAHIL HASNAIN/Desktop/Projects/naat-collection'
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
npm run mobile:android
