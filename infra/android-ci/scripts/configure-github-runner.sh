#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <runner-dir> <repo-url> <registration-token> [name] [labels]"
  exit 1
fi

RUNNER_DIR="$1"
REPO_URL="$2"
REG_TOKEN="$3"
RUNNER_NAME="${4:-do-android-runner}"
RUNNER_LABELS="${5:-self-hosted,linux,x64,android-do}"

mkdir -p "${RUNNER_DIR}"
cd "${RUNNER_DIR}"

if [[ ! -f ./config.sh ]]; then
  echo "Download the GitHub Actions runner into ${RUNNER_DIR} before running this script."
  exit 1
fi

./config.sh \
  --url "${REPO_URL}" \
  --token "${REG_TOKEN}" \
  --name "${RUNNER_NAME}" \
  --labels "${RUNNER_LABELS}" \
  --unattended \
  --replace
