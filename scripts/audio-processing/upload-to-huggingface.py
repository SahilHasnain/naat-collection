"""
Upload Naat Training Data to HuggingFace

Reads the training-data/ folder (exported by export-training-data.js)
and uploads it as a HuggingFace dataset using the Hub API directly.
No torchcodec/soundfile dependency needed.

Usage:
  1. pip install huggingface_hub
  2. huggingface-cli login  (paste your HF token)
  3. python scripts/audio-processing/upload-to-huggingface.py

The dataset will be available at:
  https://huggingface.co/datasets/<your-username>/naat-classifier
"""

import json
import os
import csv
import io
from huggingface_hub import HfApi, create_repo

# ── Config ────────────────────────────────────────────────────
TRAINING_DATA_DIR = os.path.join(os.getcwd(), "training-data")
MANIFEST_PATH = os.path.join(TRAINING_DATA_DIR, "manifest.json")
HF_DATASET_NAME = "naat-classifier"

# ── Load manifest ─────────────────────────────────────────────
with open(MANIFEST_PATH, "r") as f:
    manifest = json.load(f)

print(f"📋 Loaded {len(manifest)} chunks from manifest")

# ── Validate files exist ──────────────────────────────────────
valid = []
for entry in manifest:
    filepath = os.path.join(TRAINING_DATA_DIR, entry["file"])
    if os.path.exists(filepath):
        valid.append(entry)
    else:
        print(f"  ⚠️  Missing: {entry['file']}, skipping")

naat_count = sum(1 for e in valid if e["label"] == "naat")
expl_count = sum(1 for e in valid if e["label"] == "explanation")
print(f"✅ Found {len(valid)} valid audio files")
print(f"   Naat: {naat_count}, Explanation: {expl_count}")

# ── Create HuggingFace repo ──────────────────────────────────
api = HfApi()
user = api.whoami()["name"]
repo_id = f"{user}/{HF_DATASET_NAME}"

print(f"\n📦 Creating dataset repo: {repo_id}")
create_repo(repo_id, repo_type="dataset", private=True, exist_ok=True)

# ── Build metadata CSV ────────────────────────────────────────
csv_buffer = io.StringIO()
writer = csv.writer(csv_buffer)
writer.writerow(["file_name", "label", "source", "start", "end"])
for entry in valid:
    writer.writerow([
        f"data/{entry['file']}",
        entry["label"],
        entry["source"],
        entry["start"],
        entry["end"],
    ])

# ── Upload files ──────────────────────────────────────────────
print(f"\n🚀 Uploading {len(valid)} audio files...")

# Collect all file paths for batch upload
upload_files = []
for entry in valid:
    local_path = os.path.join(TRAINING_DATA_DIR, entry["file"])
    remote_path = f"data/{entry['file']}"
    upload_files.append((local_path, remote_path))

# Upload audio files in a single commit using upload_folder approach
# First upload metadata.csv
api.upload_file(
    path_or_fileobj=csv_buffer.getvalue().encode("utf-8"),
    path_in_repo="metadata.csv",
    repo_id=repo_id,
    repo_type="dataset",
    commit_message="Add metadata.csv",
)
print("  ✅ metadata.csv uploaded")

# Upload all audio files via upload_large_folder
# Note: upload_large_folder uploads from folder root, so we upload subdirectories
for subdir in ["naat", "explanation"]:
    subdir_path = os.path.join(TRAINING_DATA_DIR, subdir)
    if os.path.exists(subdir_path):
        api.upload_large_folder(
            folder_path=subdir_path,
            repo_id=repo_id,
            repo_type="dataset",
            allow_patterns=["*.wav"],
            repo_path_in_folder=f"data/{subdir}",
        )
print(f"  ✅ {len(valid)} audio files uploaded")

print(f"\n✅ Done! Dataset uploaded to: https://huggingface.co/datasets/{repo_id}")
print(f"   Use in Colab: load_dataset('{repo_id}')")
