import torch
import numpy as np
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AudioClassifier:
    def __init__(self, model_name: str = "sahilhasnain07/naat-classifier-model", device: str = None, revision: str = None):
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        self.model_name = model_name
        self.revision = revision or "main"
        self.chunk_duration = 5
        self.hop_duration = 1
        self.sample_rate = 16000
        self.merge_gap = 10
        # A second is only cut as explanation if the model is confident enough.
        # Low-confidence/quiet audio defaults to naat so quiet naat passages
        # (fades, soft recitation) are never clipped away.
        self.explanation_threshold = 0.6
        # The window's decision flips *before* the window is half-filled with the new
        # class (model is biased toward the dominant class). Empirically L/2=2.5s
        # overshoots; 1.5s lands nearest on known ground truth.
        self.boundary_offset = 1.5
        
        self.load_model()
        
    def load_model(self):
        """Load the trained model from Hugging Face"""
        try:
            logger.info(f"Loading model: {self.model_name}@{self.revision}")
            self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.model_name, revision=self.revision)
            self.model = AutoModelForAudioClassification.from_pretrained(self.model_name, revision=self.revision)
            self.model.to(self.device)
            self.model.eval()
            
            # Get label mappings - EXACTLY like original script
            id2label = self.model.config.id2label
            self.naat_idx = None
            self.expl_idx = None
            
            for idx_key, lbl in id2label.items():
                idx_int = int(idx_key) if isinstance(idx_key, str) else idx_key
                if lbl == "naat":
                    self.naat_idx = idx_int
                else:  # anything else is explanation
                    self.expl_idx = idx_int
            
            if self.naat_idx is None:
                self.naat_idx = 0
            if self.expl_idx is None:
                self.expl_idx = 1
                
            logger.info(f"Model loaded. Labels: {id2label}, naat_idx={self.naat_idx}, expl_idx={self.expl_idx}")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def boundary_trajectory(self, audio: np.ndarray, center: float, window: float, hop: float):
        """Fine-grained (2-class) probability trajectory around a boundary.
        Returns [(t, expl_prob, naat_prob), ...] using single classification windows."""
        sr = self.sample_rate
        n = len(audio)
        dur = n / sr
        last_start = dur - self.chunk_duration
        traj = []
        t = max(0.0, center - window)
        t_end = min(last_start, center + window)
        while t <= t_end:
            start = int(t * sr)
            a = audio[start : start + int(self.chunk_duration * sr)]
            if len(a) < sr:
                break
            if len(a) < self.chunk_duration * sr:
                a = np.pad(a, (0, self.chunk_duration * sr - len(a)))
            inputs = self.feature_extractor(
                a,
                sampling_rate=sr,
                max_length=self.chunk_duration * sr,
                truncation=True,
                return_tensors="pt",
            )
            with torch.no_grad():
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                probs = torch.softmax(self.model(**inputs).logits, dim=-1).squeeze().cpu().numpy()
            traj.append((t, float(probs[self.expl_idx]), float(probs[self.naat_idx])))
            t += hop
        return traj

    def _first_sustained_crossing(self, traj, wins_a_over_b, hyst=2):
        """Locate the exact probability 0.5-crossing (interpolated) where class A becomes
        dominant over B and stays dominant for >= hyst consecutive points.
        Returns the interpolated crossing time."""
        for i in range(1, len(traj)):
            t0, e0, n0 = traj[i - 1]
            t1, e1, n1 = traj[i]
            r0 = e0 / (e0 + n0) if (e0 + n0) > 0 else 0.5
            r1 = e1 / (e1 + n1) if (e1 + n1) > 0 else 0.5
            if abs(r1 - r0) < 1e-9:
                continue
            if wins_a_over_b and not (r0 < 0.5 <= r1):
                continue
            if not wins_a_over_b and not (r0 >= 0.5 > r1):
                continue
            ok = True
            for j in range(i, min(i + hyst, len(traj))):
                tj, ej, nj = traj[j]
                rj = ej / (ej + nj) if (ej + nj) > 0 else 0.5
                if wins_a_over_b and rj < 0.5:
                    ok = False
                    break
                if not wins_a_over_b and rj > 0.5:
                    ok = False
                    break
            if ok:
                frac = (0.5 - r0) / (r1 - r0)
                return t0 + frac * (t1 - t0)
        return None

    def _steepest_gradient(self, audio: np.ndarray, center: float, window: float = 3.0, hop: float = 0.25):
        """Where explanation probability changes fastest — content-based transition point."""
        traj = self.boundary_trajectory(audio, center, window, hop)
        if len(traj) < 3:
            return None
        best = None
        best_g = -1.0
        for i in range(1, len(traj)):
            dt = traj[i][0] - traj[i - 1][0]
            if dt <= 0:
                continue
            g = abs(traj[i][1] - traj[i - 1][1]) / dt
            if g > best_g:
                best_g = g
                best = traj[i][0]
        return round(best + self.boundary_offset / 2.0, 2) if best is not None else None

    def find_conf_boundary(self, audio: np.ndarray, rough_time: float, direction: str, window: float = 3.0, hop: float = 0.25, hyst: int = 2):
        """Content-based boundary. The 5s window frames content at its leading edge, so a
        0.5-crossing in window-start time sits L/2 before the true content boundary:
        true_boundary = crossing + chunk_duration / 2."""
        traj = self.boundary_trajectory(audio, rough_time, window, hop)
        crossing = self._first_sustained_crossing(
            traj, wins_a_over_b=(direction == "start"), hyst=hyst
        )
        if crossing is None:
            # The coarse boundary may sit inside the explanation, so the window scan
            # never sees the pre-crossing side. Retry wider with no hysteresis.
            traj = self.boundary_trajectory(audio, rough_time, window + 2.0, hop)
            crossing = self._first_sustained_crossing(
                traj, wins_a_over_b=(direction == "start"), hyst=1
            )
        if crossing is None:
            return None
        refined = crossing + self.boundary_offset
        # Edge guard: only accept if comfortably inside the scanned window.
        lo, hi = rough_time - window + 0.5, rough_time + window + 0.5
        if not (lo <= refined <= hi):
            return self._steepest_gradient(audio, rough_time)
        return round(refined, 2)

    def classify_audio(self, audio: np.ndarray) -> Dict:
        """Classify audio using EXACT logic from original script"""
        total_duration = len(audio) / self.sample_rate
        num_seconds = int(np.ceil(total_duration))
        
        # Initialize vote arrays
        naat_scores = np.zeros(num_seconds)
        expl_scores = np.zeros(num_seconds)
        vote_counts = np.zeros(num_seconds)
        
        # Sliding window classification
        num_windows = max(1, int(np.ceil((total_duration - self.chunk_duration) / self.hop_duration)) + 1)
        logger.info(f"Classifying {num_windows} overlapping windows")
        
        for i in range(num_windows):
            start = i * self.hop_duration
            end = start + self.chunk_duration
            start_sample = int(start * self.sample_rate)
            end_sample = min(int(end * self.sample_rate), len(audio))
            chunk_audio = audio[start_sample:end_sample]
            
            if len(chunk_audio) < self.sample_rate:  # skip chunks shorter than 1 second
                break
            
            # Pad short chunks to CHUNK_DURATION
            if len(chunk_audio) < self.chunk_duration * self.sample_rate:
                chunk_audio = np.pad(chunk_audio, (0, self.chunk_duration * self.sample_rate - len(chunk_audio)))
            
            inputs = self.feature_extractor(
                chunk_audio,
                sampling_rate=self.sample_rate,
                max_length=self.chunk_duration * self.sample_rate,
                truncation=True,
                return_tensors="pt",
            )
            
            with torch.no_grad():
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                logits = self.model(**inputs).logits
                probs = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()
            
            # Distribute scores to 1-second slots
            slot_start = int(start)
            slot_end = min(int(np.ceil(end)), num_seconds)
            for s in range(slot_start, slot_end):
                naat_scores[s] += probs[self.naat_idx]
                expl_scores[s] += probs[self.expl_idx]
                vote_counts[s] += 1
        
        # --- Per-second label assignment (EXACT logic) ---
        chunks = []
        for s in range(num_seconds):
            if vote_counts[s] == 0:
                continue
            avg_naat = naat_scores[s] / vote_counts[s]
            avg_expl = expl_scores[s] / vote_counts[s]
            # CRITICAL: Use >= like original script. Explanation only cut when confident,
            # otherwise keep as naat (protects quiet naat portions from being clipped).
            if avg_expl >= avg_naat and avg_expl >= self.explanation_threshold:
                label = "explanation"
            else:
                label = "naat"
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
                        and r["start"] - merged[-1]["end"] <= self.merge_gap):
                    merged[-1]["end"] = r["end"]
                    merged[-1]["scores"].extend(r["scores"])
                else:
                    merged.append(dict(r))
            else:
                merged.append(dict(r))
        
        # --- Refine boundaries using content-based confidence crossing ---
        logger.info("Refining segment boundaries...")
        for seg in merged:
            if seg["label"] == "explanation":
                if seg["start"] > 0:
                    refined = self.find_conf_boundary(audio, seg["start"], "start")
                    if refined is not None:
                        seg["start"] = refined
                if seg["end"] < total_duration:
                    refined = self.find_conf_boundary(audio, seg["end"], "end")
                    if refined is not None:
                        seg["end"] = refined
        
        # --- Build output (EXACT format) ---
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
        
        return {
            "duration": round(total_duration, 2),
            "speechSegments": speech_segments,
            "allSegments": all_segments,
            "totalSpeechDuration": round(total_speech),
            "totalSingingDuration": round(total_singing),
        }
