"""
Speech vs Singing/Naat Segment Detector

Analyzes audio using librosa spectral features + K-means clustering
to distinguish conversational speech (explanations) from naat singing.
No manual threshold tuning needed — adapts to each audio file.

Usage:
    python scripts/audio-processing/detect_segments.py <audio_file_path>

Output:
    JSON to stdout with detected explanation segments (parts to cut).
"""

import sys
import json
import numpy as np
import librosa
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# ── Configuration ──────────────────────────────────────────────

SAMPLE_RATE = 22050
WINDOW_SEC = 3.0        # Analysis window size in seconds
HOP_SEC = 1.5           # Window hop (overlap = window - hop)
MIN_SEGMENT_SEC = 2.0   # Minimum segment length to report
MERGE_GAP_SEC = 5.0     # Merge speech segments within this gap
SILENCE_THRESH = 0.005  # RMS below this = silence

# Features where HIGHER value → more likely speech
SPEECH_HIGHER_FEATURES = [
    "flatness_mean",     # speech = noisy/aperiodic
    "zcr_mean",          # speech = more zero crossings
    "rms_cv",            # speech = more volume variation
    "mfcc_delta_energy", # speech = faster spectral changes
    "centroid_std",      # speech = less stable pitch
    "bandwidth_mean",    # speech = wider frequency spread
]

# Features where HIGHER value → more likely singing
SINGING_HIGHER_FEATURES = [
    "contrast_mean",     # singing = stronger harmonics
    "harmonic_ratio",    # singing = more harmonic content
]


def extract_window_features(y_window, sr):
    """Extract acoustic features for a single audio window."""
    if len(y_window) < sr * 0.5:
        return None

    rms = float(np.mean(librosa.feature.rms(y=y_window)))
    if rms < SILENCE_THRESH:
        return {"type": "silence", "rms": rms}

    # Spectral flatness: speech is noise-like (higher), singing is tonal (lower)
    flatness = librosa.feature.spectral_flatness(y=y_window)[0]
    flatness_mean = float(np.mean(flatness))

    # Zero-crossing rate: speech typically higher
    zcr = librosa.feature.zero_crossing_rate(y=y_window)[0]
    zcr_mean = float(np.mean(zcr))

    # Spectral centroid variability: speech pitch is less stable
    centroid = librosa.feature.spectral_centroid(y=y_window, sr=sr)[0]
    centroid_std = float(np.std(centroid))

    # Spectral bandwidth: speech tends wider
    bandwidth = librosa.feature.spectral_bandwidth(y=y_window, sr=sr)[0]
    bandwidth_mean = float(np.mean(bandwidth))

    # Spectral contrast: singing has stronger harmonics
    contrast = librosa.feature.spectral_contrast(y=y_window, sr=sr)
    contrast_mean = float(np.mean(contrast))

    # RMS energy coefficient of variation: speech volume fluctuates more
    rms_frames = librosa.feature.rms(y=y_window)[0]
    rms_std = float(np.std(rms_frames))
    rms_cv = rms_std / (rms + 1e-8)

    # MFCC delta energy: speech has more rapid spectral changes
    mfccs = librosa.feature.mfcc(y=y_window, sr=sr, n_mfcc=13)
    mfcc_delta = librosa.feature.delta(mfccs)
    mfcc_delta_energy = float(np.mean(np.abs(mfcc_delta)))

    # Harmonic-to-percussive ratio: singing = more harmonic
    y_harm, y_perc = librosa.effects.hpss(y_window)
    harm_energy = float(np.mean(y_harm ** 2))
    perc_energy = float(np.mean(y_perc ** 2))
    harmonic_ratio = harm_energy / (harm_energy + perc_energy + 1e-10)

    return {
        "rms": rms,
        "flatness_mean": flatness_mean,
        "zcr_mean": zcr_mean,
        "centroid_std": centroid_std,
        "bandwidth_mean": bandwidth_mean,
        "contrast_mean": contrast_mean,
        "rms_cv": rms_cv,
        "mfcc_delta_energy": mfcc_delta_energy,
        "harmonic_ratio": harmonic_ratio,
    }


def classify_windows_kmeans(feature_list, window_meta):
    """
    Classify all non-silence windows using K-means clustering.
    Returns list of (label, confidence) for each window in window_meta.
    """
    # Build feature matrix from non-silence windows
    valid_indices = []
    feature_rows = []
    feature_keys = [
        "flatness_mean", "zcr_mean", "rms_cv", "mfcc_delta_energy",
        "centroid_std", "bandwidth_mean", "contrast_mean", "harmonic_ratio",
    ]

    for i, feat in enumerate(feature_list):
        if feat is not None and feat.get("type") != "silence":
            row = [feat[k] for k in feature_keys]
            feature_rows.append(row)
            valid_indices.append(i)

    results = [("silence", 0.0)] * len(feature_list)

    if len(feature_rows) < 4:
        # Too few windows to cluster — mark all as singing
        for i in valid_indices:
            results[i] = ("singing", 0.5)
        return results

    X = np.array(feature_rows)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # K-means with 2 clusters
    km = KMeans(n_clusters=2, n_init=10, random_state=42)
    labels = km.fit_predict(X_scaled)

    # Determine which cluster is speech vs singing using feature means.
    # Speech has: higher flatness, higher zcr, higher mfcc_delta, lower harmonic_ratio
    cluster_means = {}
    for c in [0, 1]:
        mask = labels == c
        cluster_means[c] = {k: float(np.mean(X[mask, j]))
                            for j, k in enumerate(feature_keys)}

    # Score each cluster: positive = more speech-like
    def speech_score(means):
        s = 0.0
        # Features where higher = speech
        for feat in SPEECH_HIGHER_FEATURES:
            if feat in means:
                s += means[feat]
        # Features where higher = singing (subtract)
        for feat in SINGING_HIGHER_FEATURES:
            if feat in means:
                s -= means[feat]
        return s

    # We can't just compare raw values because units differ.
    # Instead compare which cluster has relatively higher speech features.
    score_0 = 0
    score_1 = 0
    for feat in SPEECH_HIGHER_FEATURES:
        if feat in cluster_means[0] and feat in cluster_means[1]:
            if cluster_means[0][feat] > cluster_means[1][feat]:
                score_0 += 1
            else:
                score_1 += 1
    for feat in SINGING_HIGHER_FEATURES:
        if feat in cluster_means[0] and feat in cluster_means[1]:
            # Higher = singing, so the higher one gets a singing vote
            if cluster_means[0][feat] > cluster_means[1][feat]:
                score_1 += 1  # cluster 0 is more singing-like for this feature
            else:
                score_0 += 1

    speech_cluster = 0 if score_0 > score_1 else 1

    # Check if clusters are actually distinct enough
    # Use the distance between cluster centers in scaled space
    center_dist = float(np.linalg.norm(
        km.cluster_centers_[0] - km.cluster_centers_[1]
    ))

    # If clusters are too close, the audio is likely all one type
    if center_dist < 1.5:
        # Determine if it's all singing or all speech using harmonic ratio
        avg_harmonic = float(np.mean(X[:, feature_keys.index("harmonic_ratio")]))
        avg_flatness = float(np.mean(X[:, feature_keys.index("flatness_mean")]))
        # Naat audio tends to be highly harmonic with low flatness
        default_label = "singing"  # most naats are primarily singing
        print(f"Clusters not distinct (dist={center_dist:.2f}). "
              f"Treating as all {default_label}.", file=sys.stderr)
        for i in valid_indices:
            results[i] = (default_label, 0.3)
        return results

    print(f"Cluster distance: {center_dist:.2f}, "
          f"speech_cluster={speech_cluster}, "
          f"feature_votes: c0={score_0} c1={score_1}", file=sys.stderr)

    # Compute per-window confidence from distance to cluster centers
    distances = km.transform(X_scaled)  # shape (n, 2)
    for idx_in_valid, orig_idx in enumerate(valid_indices):
        cluster = labels[idx_in_valid]
        label = "speech" if cluster == speech_cluster else "singing"

        # Confidence: how much closer to assigned center vs other center
        d_own = distances[idx_in_valid, cluster]
        d_other = distances[idx_in_valid, 1 - cluster]
        confidence = float(np.clip((d_other - d_own) / (d_other + d_own + 1e-8), 0.1, 1.0))

        results[orig_idx] = (label, round(confidence, 3))

    return results


def merge_segments(raw_segments, merge_gap, min_length):
    """Merge adjacent same-type segments and filter short ones."""
    if not raw_segments:
        return []

    merged = [raw_segments[0].copy()]
    for seg in raw_segments[1:]:
        prev = merged[-1]
        # Merge if same type and gap is small
        if (seg["type"] == prev["type"] and
                seg["start"] - prev["end"] <= merge_gap):
            prev["end"] = seg["end"]
            prev["confidence"] = (prev["confidence"] + seg["confidence"]) / 2
        else:
            merged.append(seg.copy())

    # Filter out segments shorter than minimum
    return [s for s in merged if s["end"] - s["start"] >= min_length]


def detect_segments(audio_path):
    """Main detection: analyze audio and return explanation segments."""
    print(f"Loading audio: {audio_path}", file=sys.stderr)
    y, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
    duration = len(y) / sr
    print(f"Duration: {duration:.1f}s, Sample rate: {sr}", file=sys.stderr)

    window_samples = int(WINDOW_SEC * sr)
    hop_samples = int(HOP_SEC * sr)

    # Pass 1: Extract features for all windows
    window_meta = []  # (start_sec, end_sec) for each window
    feature_list = []

    pos = 0
    while pos + window_samples <= len(y):
        start_sec = pos / sr
        end_sec = (pos + window_samples) / sr
        y_window = y[pos:pos + window_samples]
        features = extract_window_features(y_window, sr)
        window_meta.append((round(start_sec, 1), round(end_sec, 1)))
        feature_list.append(features)
        pos += hop_samples

    # Handle last partial window
    if pos < len(y) and len(y) - pos > sr * 1.0:
        y_window = y[pos:]
        start_sec = pos / sr
        features = extract_window_features(y_window, sr)
        window_meta.append((round(start_sec, 1), round(duration, 1)))
        feature_list.append(features)

    # Pass 2: Classify all windows using K-means clustering
    classifications = classify_windows_kmeans(feature_list, window_meta)

    windows = []
    for i, (start_sec, end_sec) in enumerate(window_meta):
        label, confidence = classifications[i]
        windows.append({
            "start": start_sec,
            "end": end_sec,
            "type": label,
            "confidence": round(confidence, 3),
        })

    # Build contiguous segments from windows
    raw_segments = []
    for w in windows:
        if w["type"] == "silence":
            continue
        if (raw_segments and
                raw_segments[-1]["type"] == w["type"] and
                w["start"] - raw_segments[-1]["end"] <= HOP_SEC + 0.1):
            raw_segments[-1]["end"] = w["end"]
            raw_segments[-1]["confidence"] = (
                raw_segments[-1]["confidence"] + w["confidence"]
            ) / 2
        else:
            raw_segments.append(w.copy())

    # Merge nearby same-type segments
    all_segments = merge_segments(raw_segments, MERGE_GAP_SEC, MIN_SEGMENT_SEC)

    # Extract only the speech/explanation segments (parts to cut)
    # Ignore short speech segments (≤5s) — likely brief pauses, not real explanations
    speech_segments = [
        {
            "start": round(s["start"], 1),
            "end": round(s["end"], 1),
            "confidence": round(s["confidence"], 3),
            "duration": round(s["end"] - s["start"], 1),
        }
        for s in all_segments
        if s["type"] == "speech" and (s["end"] - s["start"]) > 5.0
    ]

    # Second pass: merge speech segments that are close together (≤5s gap),
    # even if there's a small singing segment in between
    merged_speech = []
    for seg in speech_segments:
        if merged_speech and seg["start"] - merged_speech[-1]["end"] <= MERGE_GAP_SEC:
            merged_speech[-1]["end"] = seg["end"]
            merged_speech[-1]["duration"] = round(merged_speech[-1]["end"] - merged_speech[-1]["start"], 1)
            merged_speech[-1]["confidence"] = round((merged_speech[-1]["confidence"] + seg["confidence"]) / 2, 3)
        else:
            merged_speech.append(seg.copy())
    speech_segments = merged_speech

    # Build a summary of all segments for visualization
    all_for_display = [
        {
            "start": round(s["start"], 1),
            "end": round(s["end"], 1),
            "type": s["type"],
            "confidence": round(s["confidence"], 3),
        }
        for s in all_segments
    ]

    return {
        "duration": round(duration, 1),
        "speechSegments": speech_segments,
        "allSegments": all_for_display,
        "totalSpeechDuration": round(
            sum(s["duration"] for s in speech_segments), 1
        ),
        "totalSingingDuration": round(
            sum(s["end"] - s["start"] for s in all_segments if s["type"] == "singing"), 1
        ),
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python detect_segments.py <audio_file_path> [debug]", file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    debug_mode = len(sys.argv) > 2 and sys.argv[2] == "debug"

    if debug_mode:
        # Print raw features per window + cluster labels
        y, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
        duration = len(y) / sr
        window_samples = int(WINDOW_SEC * sr)
        hop_samples = int(HOP_SEC * sr)

        window_meta = []
        feature_list = []
        pos = 0
        while pos + window_samples <= len(y):
            start = pos / sr
            end = (pos + window_samples) / sr
            feat = extract_window_features(y[pos:pos + window_samples], sr)
            window_meta.append((round(start, 1), round(end, 1)))
            feature_list.append(feat)
            pos += hop_samples

        classifications = classify_windows_kmeans(feature_list, window_meta)

        print(f"Duration: {duration:.1f}s\n")
        print(f"{'TIME':>10} | {'LABEL':>8} | {'CONF':>5} | {'FLAT':>6} | {'ZCR':>6} | {'RMS_CV':>6} | {'MFCC_D':>6} | {'CENT_STD':>8} | {'CONTR':>6} | {'BW':>6} | {'HARM':>5}")
        print("-" * 110)

        for i, (start, end) in enumerate(window_meta):
            feat = feature_list[i]
            label, conf = classifications[i]
            if feat and feat.get("type") != "silence":
                print(f"{start:7.1f}-{end:.1f} | {label:>8} | {conf:>5.2f} | {feat['flatness_mean']:>6.4f} | {feat['zcr_mean']:>6.4f} | {feat['rms_cv']:>6.3f} | {feat['mfcc_delta_energy']:>6.2f} | {feat['centroid_std']:>8.1f} | {feat['contrast_mean']:>6.1f} | {feat['bandwidth_mean']:>6.0f} | {feat['harmonic_ratio']:>5.3f}")
            else:
                print(f"{start:7.1f}-{end:.1f} | {'silence':>8} |")
    else:
        result = detect_segments(audio_path)
        print(json.dumps(result, indent=2))
