"""
Upload Naat Training Data to HuggingFace

Reads the training-data/ folder (exported by export-training-data.js)
and uploads it as a HuggingFace Audio dataset.

Usage:
  1. pip install datasets huggingface_hub soundfile
  2. huggingface-cli login  (paste your HF token)
  3. python scripts/audio-processing/upload-to-huggingface.py

The dataset will be available at:
  https://huggingface.co/datasets/<your-username>/naat-classifier
"""

import json
import os
from datasets import Dataset, Audio, ClassLabel, Features

# ── Config ────────────────────────────────────────────────────
TRAINING_DATA_DIR = os.path.join(os.getcwd(), "training-data")
MANIFEST_PATH = os.path.join(TRAINING_DATA_DIR, "manifest.json")
HF_DATASET_NAME = "naat-classifier"  # change if you want a different name

# ── Load manifest ─────────────────────────────────────────────
with open(MANIFEST_PATH, "r") as f:
    manifest = json.load(f)

print(f"📋 Loaded {len(manifest)} chunks from manifest")

# ── Build dataset rows ────────────────────────────────────────
audio_paths = []
labels = []
sources = []
starts = []
ends = []

for entry in manifest:
    filepath = os.path.join(TRAINING_DATA_DIR, entry["file"])
    if not os.path.exists(filepath):
        print(f"  ⚠️  Missing: {entry['file']}, skipping")
        continue
    audio_paths.append(filepath)
    labels.append(entry["label"])
    sources.append(entry["source"])
    starts.append(entry["start"])
    ends.append(entry["end"])

print(f"✅ Found {len(audio_paths)} valid audio files")
print(f"   Naat: {labels.count('naat')}, Explanation: {labels.count('explanation')}")

# ── Create HuggingFace Dataset ────────────────────────────────
features = Features({
    "audio": Audio(sampling_rate=16000),
    "label": ClassLabel(names=["naat", "explanation"]),
    "source": "string",
    "start": "float32",
    "end": "float32",
})

dataset = Dataset.from_dict(
    {
        "audio": audio_paths,
        "label": labels,
        "source": sources,
        "start": starts,
        "end": ends,
    },
    features=features,
)

# ── Push to HuggingFace Hub ───────────────────────────────────
print(f"\n🚀 Uploading to HuggingFace as '{HF_DATASET_NAME}'...")
dataset.push_to_hub(HF_DATASET_NAME, private=True)

print(f"\n✅ Done! Dataset uploaded.")
print(f"   View it at: https://huggingface.co/datasets/<your-username>/{HF_DATASET_NAME}")
print(f"   Use in Colab: dataset = load_dataset('<your-username>/{HF_DATASET_NAME}')")
