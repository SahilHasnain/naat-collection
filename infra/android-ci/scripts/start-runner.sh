#!/usr/bin/env bash
set -euo pipefail

RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner}"

if [[ ! -x "${RUNNER_DIR}/run.sh" ]]; then
  echo "GitHub Actions runner is not installed in ${RUNNER_DIR}."
  echo "Install and configure the runner first, then rerun."
  exit 1
fi

cd "${RUNNER_DIR}"
exec ./run.sh
