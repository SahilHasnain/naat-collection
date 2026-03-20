#!/usr/bin/env bash
set -euo pipefail

CACHE_DIR="${HF_HOME:-$HOME/.cache/huggingface}"
MODEL_CACHE_DIR="$CACHE_DIR/hub/models--sahilhasnain07--naat-classifier-model"

echo "Checking Hugging Face model cache..."
echo "Target: $MODEL_CACHE_DIR"

if [ -d "$MODEL_CACHE_DIR" ]; then
  rm -rf "$MODEL_CACHE_DIR"
  echo "Deleted cached model."
else
  echo "Model cache not found. Nothing to delete."
fi
