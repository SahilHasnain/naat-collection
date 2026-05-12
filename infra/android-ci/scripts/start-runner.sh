#!/usr/bin/env bash
set -euo pipefail

RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner}"

cd "${RUNNER_DIR}"

# Check if runner is already configured
if [[ ! -f ".runner" ]]; then
  echo "Configuring GitHub Actions runner..."
  
  if [[ -z "${GITHUB_TOKEN:-}" ]] || [[ -z "${GITHUB_REPO:-}" ]]; then
    echo "Error: GITHUB_TOKEN and GITHUB_REPO environment variables must be set"
    exit 1
  fi
  
  # Get registration token
  REG_TOKEN=$(curl -sX POST -H "Authorization: token ${GITHUB_TOKEN}" \
    https://api.github.com/repos/${GITHUB_REPO}/actions/runners/registration-token | jq -r .token)
  
  if [[ "${REG_TOKEN}" == "null" ]] || [[ -z "${REG_TOKEN}" ]]; then
    echo "Error: Failed to get registration token. Check your GITHUB_TOKEN and GITHUB_REPO"
    exit 1
  fi
  
  # Configure runner
  ./config.sh --url https://github.com/${GITHUB_REPO} \
    --token ${REG_TOKEN} \
    --name ${RUNNER_NAME:-docker-runner} \
    --labels ${RUNNER_LABELS:-self-hosted,linux,x64,android-docker} \
    --work _work \
    --unattended \
    --replace
fi

# Cleanup function
cleanup() {
  echo "Removing runner..."
  if [[ -f ".runner" ]] && [[ -n "${GITHUB_TOKEN:-}" ]]; then
    ./config.sh remove --token ${GITHUB_TOKEN} || true
  fi
}

trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

# Start runner
exec ./run.sh
