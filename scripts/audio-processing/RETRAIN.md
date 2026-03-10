# Retrain Naat Classifier

## Prerequisites
- More naats labeled via admin panel (cutSegments saved)
- Python with `pip install transformers torch librosa datasets huggingface_hub evaluate accelerate soundfile`
- Google Colab with T4 GPU

## Steps

### 1. Export training data
```bash
node scripts/audio-processing/export-training-data.js
```
Outputs 5-sec WAV chunks to `training-data/` with `manifest.json`.

### 2. Upload to HuggingFace
```bash
huggingface-cli login
python scripts/audio-processing/upload-to-huggingface.py
```
Pushes to `sahilhasnain07/naat-classifier` (overwrites previous data).

### 3. Fine-tune on Colab
1. Open [Google Colab](https://colab.research.google.com), set runtime to T4 GPU
2. Paste contents of `scripts/audio-processing/colab-finetune.py` into a cell
3. Run — login when prompted, wait for training to finish
4. Model pushes to `sahilhasnain07/naat-classifier-model`

### 4. Update local model cache
Delete the cached model so next AI Detect call downloads the new one:
```bash
rm -rf ~/.cache/huggingface/hub/models--sahilhasnain07--naat-classifier-model
```

That's it. Next "🤗 AI Detect" click in admin panel uses the retrained model.
