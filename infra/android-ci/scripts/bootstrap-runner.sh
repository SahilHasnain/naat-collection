#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sudo apt-get update
sudo apt-get install -y \
  curl \
  git \
  unzip \
  zip \
  jq \
  ca-certificates \
  build-essential \
  openjdk-17-jdk \
  ruby-full \
  ruby-dev \
  libssl-dev \
  libreadline-dev \
  zlib1g-dev \
  nodejs \
  npm

"${ROOT_DIR}/scripts/install-android-sdk.sh"

gem install bundler fastlane --no-document

echo "Bootstrap complete."
echo "Next: register a GitHub self-hosted runner and add the android-do label."
