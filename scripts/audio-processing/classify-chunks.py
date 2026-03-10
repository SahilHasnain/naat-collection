"""
Classify audio chunks using the fine-tuned Wav2Vec2 model.

Usage:
  python classify-chunks.py <audio_file_path>

Output:
  JSON to stdout with per-chunk classifications and merged segments.

Requires:
  pip install transformers torch librosa
"""

import sys
import json
import os
import numpy as np

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: classify-chunks.py <audio_file>"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"File not found: {audio_path}"}))
        sys.exit(1)

    # Import heavy libs after arg check for faster error feedback
    import librosa
    import torch
    from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

    MODEL_NAME = "sahilhasnain07/naat-classifier-model"
    CHUNK_DURATION = 5  # seconds
    SAMPLE_RATE = 16000
    MERGE_GAP = 10  # merge explanation chunks within this gap (ignores short naat gaps)

    # Load model (cached after first run)
    print("Loading model...", file=sys.stderr)
    feature_extractor = AutoFeatureExtractor.from_pretrained(MODEL_NAME)
    model = AutoModelForAudioClassification.from_pretrained(MODEL_NAME)
    model.eval()

    # Load audio
    print("Loading audio...", file=sys.stderr)
    y, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
    total_duration = len(y) / sr

    # Classify each 5-second chunk
    chunks = []
    num_chunks = int(np.ceil(total_duration / CHUNK_DURATION))

    for i in range(num_chunks):
        start = i * CHUNK_DURATION
        end_sample = min(int((start + CHUNK_DURATION) * sr), len(y))
        start_sample = int(start * sr)
        chunk_audio = y[start_sample:end_sample]

        if len(chunk_audio) < sr:  # skip chunks shorter than 1 second
            break

        # Pad short chunks to CHUNK_DURATION
        if len(chunk_audio) < CHUNK_DURATION * sr:
            chunk_audio = np.pad(chunk_audio, (0, CHUNK_DURATION * sr - len(chunk_audio)))

        inputs = feature_extractor(
            chunk_audio,
            sampling_rate=SAMPLE_RATE,
            max_length=CHUNK_DURATION * SAMPLE_RATE,
            truncation=True,
            return_tensors="pt",
        )

        with torch.no_grad():
            logits = model(**inputs).logits
            probs = torch.softmax(logits, dim=-1)
            pred_id = torch.argmax(probs, dim=-1).item()
            score = probs[0][pred_id].item()

        # id2label keys can be int or str depending on how model was saved
        label = model.config.id2label.get(pred_id) or model.config.id2label.get(str(pred_id)) or ("naat" if pred_id == 0 else "explanation")
        chunk_end = min(start + CHUNK_DURATION, total_duration)

        chunks.append({
            "start": round(start, 2),
            "end": round(chunk_end, 2),
            "label": label,
            "score": round(score, 4),
        })

    # Merge consecutive explanation chunks
    explanation_chunks = [c for c in chunks if c["label"] == "explanation"]
    segments = []

    if explanation_chunks:
        current = {
            "start": explanation_chunks[0]["start"],
            "end": explanation_chunks[0]["end"],
            "scores": [explanation_chunks[0]["score"]],
        }

        for c in explanation_chunks[1:]:
            if c["start"] - current["end"] <= MERGE_GAP:
                current["end"] = c["end"]
                current["scores"].append(c["score"])
            else:
                segments.append(current)
                current = {"start": c["start"], "end": c["end"], "scores": [c["score"]]}
        segments.append(current)

    speech_segments = [{
        "start": s["start"],
        "end": s["end"],
        "confidence": round(sum(s["scores"]) / len(s["scores"]), 4),
        "duration": round(s["end"] - s["start"]),
    } for s in segments if (s["end"] - s["start"]) > 5]  # ignore speech <= 5 seconds

    total_speech = sum(s["end"] - s["start"] for s in segments)
    total_singing = total_duration - total_speech

    all_segments = [{
        "start": c["start"],
        "end": c["end"],
        "type": "speech" if c["label"] == "explanation" else "singing",
        "confidence": c["score"],
    } for c in chunks]

    result = {
        "duration": round(total_duration, 2),
        "speechSegments": speech_segments,
        "allSegments": all_segments,
        "totalSpeechDuration": round(total_speech),
        "totalSingingDuration": round(total_singing),
    }

    print(json.dumps(result))

if __name__ == "__main__":
    main()
