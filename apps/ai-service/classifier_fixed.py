import torch
import numpy as np
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AudioClassifier:
    def __init__(self, model_name: str = "sahilhasnain07/naat-classifier-model", device: str = None):
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        self.model_name = model_name
        self.chunk_duration = 5
        self.hop_duration = 1
        self.sample_rate = 16000
        self.merge_gap = 10
        
        self.load_model()
        
    def load_model(self):
        """Load the trained model from Hugging Face"""
        try:
            logger.info(f"Loading model: {self.model_name}")
            self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.model_name)
            self.model = AutoModelForAudioClassification.from_pretrained(self.model_name)
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
    
    def find_transition_point(self, audio: np.ndarray, rough_time: float, search_radius: float = 2.5) -> float:
        """Find exact transition point using RMS energy change"""
        sr = self.sample_rate
        start_sample = max(0, int((rough_time - search_radius) * sr))
        end_sample = min(len(audio), int((rough_time + search_radius) * sr))
        segment = audio[start_sample:end_sample]

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
        # Find the point of maximum RMS change
        diff = np.abs(np.diff(rms))
        peak_idx = np.argmax(diff)
        # Convert frame index back to time
        refined_time = rough_time - search_radius + (peak_idx * hop) / sr
        return max(0.0, round(refined_time, 2))
    
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
            # CRITICAL: Use >= like original script
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
                        and r["start"] - merged[-1]["end"] <= self.merge_gap):
                    merged[-1]["end"] = r["end"]
                    merged[-1]["scores"].extend(r["scores"])
                else:
                    merged.append(dict(r))
            else:
                merged.append(dict(r))
        
        # --- Refine boundaries using energy detection ---
        logger.info("Refining segment boundaries...")
        for seg in merged:
            if seg["label"] == "explanation":
                if seg["start"] > 0:
                    seg["start"] = self.find_transition_point(audio, seg["start"])
                if seg["end"] < total_duration:
                    seg["end"] = self.find_transition_point(audio, seg["end"])
        
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
