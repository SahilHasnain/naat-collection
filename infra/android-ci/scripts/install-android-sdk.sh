#!/usr/bin/env bash
set -euo pipefail

ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-/opt/android-sdk}"
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip"
TMP_DIR="$(mktemp -d)"

sudo mkdir -p "${ANDROID_SDK_ROOT}/cmdline-tools"
cd "${TMP_DIR}"

curl -fsSL "${CMDLINE_TOOLS_URL}" -o commandlinetools.zip
unzip -q commandlinetools.zip

sudo rm -rf "${ANDROID_SDK_ROOT}/cmdline-tools/latest"
sudo mv cmdline-tools "${ANDROID_SDK_ROOT}/cmdline-tools/latest"

yes | sudo "${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager" --sdk_root="${ANDROID_SDK_ROOT}" --licenses
sudo "${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager" --sdk_root="${ANDROID_SDK_ROOT}" \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.0" \
  "cmdline-tools;latest"

rm -rf "${TMP_DIR}"
