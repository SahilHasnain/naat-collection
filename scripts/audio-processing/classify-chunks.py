"""
Classify audio chunks using the fine-tuned Wav2Vec2 model.

Uses a sliding window with overlap for precise segment boundaries,
plus energy-based refinement to find exact transition points.

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


def find_transition_point(y, sr, rough_time, search_radius=2.5):
    """
    Given a rough transition time, use RMS energy change to find
    the exact transition point within ±search_radius seconds.
    Speech/explanation tends to have lower, steadier energy than singing.
    """
    start_sample = max(0, int((rough_time - search_radius) * sr))
    end_sample = min(len(y), int((rough_time + search_radius) * sr))
    segment = y[start_sample:end_sample]

    if len(segment) < sr * 0.5:
        return rough_time

    # Compute short-time RMS with 100ms frames
    frame_length = int(0.1 * sr)
    hop = frame_length // 2
    rms = []
    for i in range(0, len(segment) - frame_length, hop):
        frame = segment[i : i + frame_length]
        rms.append(np.sqrt(np.mean(frame**2)))

    if len(rms) < 3:
        return rough_time

    rms = np.array(rms)
    # Find the point of maximum RMS change (likely the transition)
    diff = np.abs(np.diff(rms))
    peak_idx = np.argmax(diff)
    # Convert frame index back to time
    refined_time = rough_time - search_radius + (peak_idx * hop) / sr
    return max(0.0, round(refined_time, 2))


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
    CHUNK_DURATION = 5   # seconds — model context window
    HOP_DURATION = 1     # seconds — sliding window hop for ~1s boundary resolution
    SAMPLE_RATE = 16000
    MERGE_GAP = 10       # merge explanation chunks within this gap

    # Load model (cached after first run)
    print("Loading model...", file=sys.stderr)
    feature_extractor = AutoFeatureExtractor.from_pretrained(MODEL_NAME)
    model = AutoModelForAudioClassification.from_pretrained(MODEL_NAME)
    model.eval()

    # Load audio
    print("Loading audio...", file=sys.stderr)
    y, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
    total_duration = len(y) / sr

    # --- Sliding window classification ---
    # Each 1-second slice gets votes from all 5-sec windows that cover it.
    num_seconds = int(np.ceil(total_duration))
    naat_scores = np.zeros(num_seconds)
    expl_scores = np.zeros(num_seconds)
    vote_counts = np.zeros(num_seconds)

    num_windows = max(1, int(np.ceil((total_duration - CHUNK_DURATION) / HOP_DURATION)) + 1)
    print(f"Classifying {num_windows} overlapping windows...", file=sys.stderr)

    # Resolve label indices once
    id2label = model.config.id2label
    naat_idx = None
    expl_idx = None
    for idx_key, lbl in id2label.items():
        idx_int = int(idx_key) if isinstance(idx_key, str) else idx_key
        if lbl == "naat":
            naat_idx = idx_int
        else:
            expl_idx = idx_int
    if naat_idx is None:
        naat_idx = 0
    if expl_idx is None:
        expl_idx = 1

    for i in range(num_windows):
        start = i * HOP_DURATION
        end = start + CHUNK_DURATION
        start_sample = int(start * sr)
        end_sample = min(int(end * sr), len(y))
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
            probs = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()

        # Distribute this window's scores to each 1-sec slot it covers
        slot_start = int(start)
        slot_end = min(int(np.ceil(end)), num_seconds)
        for s in range(slot_start, slot_end):
            naat_scores[s] += probs[naat_idx]
            expl_scores[s] += probs[expl_idx]
            vote_counts[s] += 1

    # --- Per-second label assignment ---
    chunks = []
    for s in range(num_seconds):
        if vote_counts[s] == 0:
            continue
        avg_naat = naat_scores[s] / vote_counts[s]
        avg_expl = expl_scores[s] / vote_counts[s]
        label = "naat" if avg_naat >= avg_expl else "explanation"
        score = max(avg_naat, avg_expl)
        sec_end = min(s + 1, total_duration)
        chunks.append({
            "start": round(float(s), 2),
            "end": round(sec_end, 2),
            "label": label,
            "score": round(float(score), 4),
        })

    # --- Merge consecutive same-label chunks into runs ---
    runs = []
    if chunks:
        cur = {"start": chunks[0]["start"], "end": chunks[0]["end"],
               "label": chunks[0]["label"], "scores": [chunks[0]["score"]]}
        for c in chunks[1:]:
            if c["label"] == cur["label"]:
                cur["end"] = c["end"]
                cur["scores"].append(c["score"])
            else:
                runs.append(cur)
                cur = {"start": c["start"], "end": c["end"],
                       "label": c["label"], "scores": [c["score"]]}
        runs.append(cur)

    # --- Merge explanation runs separated by short naat gaps (< MERGE_GAP) ---
    merged = []
    for r in runs:
        if r["label"] == "explanation":
            if (merged and merged[-1]["label"] == "explanation"
                    and r["start"] - merged[-1]["end"] <= MERGE_GAP):
                merged[-1]["end"] = r["end"]
                merged[-1]["scores"].extend(r["scores"])
            else:
                merged.append(dict(r))
        else:
            merged.append(dict(r))

    # --- Refine boundaries using energy detection ---
    print("Refining segment boundaries...", file=sys.stderr)
    for seg in merged:
        if seg["label"] == "explanation":
            if seg["start"] > 0:
                seg["start"] = find_transition_point(y, sr, seg["start"])
            if seg["end"] < total_duration:
                seg["end"] = find_transition_point(y, sr, seg["end"])

    # --- Build output ---
    speech_segments = []
    for seg in merged:
        if seg["label"] == "explanation":
            dur = seg["end"] - seg["start"]
            if dur > 5:  # ignore speech <= 5 seconds
                speech_segments.append({
                    "start": seg["start"],
                    "end": seg["end"],
                    "confidence": round(sum(seg["scores"]) / len(seg["scores"]), 4),
                    "duration": round(dur),
                })

    total_speech = sum(s["end"] - s["start"] for s in merged if s["label"] == "explanation")
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
