import torch
import torch.nn as nn
import numpy as np
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
from typing import List, Tuple, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AudioClassifier:
    def __init__(self, model_name: str = "sahilhasnain07/naat-classifier-model", device: str = None):
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        self.model_name = model_name
        self.model = None
        self.feature_extractor = None
        self.load_model()
        
    def load_model(self):
        """Load the trained model from Hugging Face"""
        try:
            logger.info(f"Loading model: {self.model_name}")
            self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.model_name)
            self.model = AutoModelForAudioClassification.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
            
            # Get label mappings
            self.id2label = self.model.config.id2label
            self.naat_idx = None
            self.expl_idx = None
            
            for idx_key, lbl in self.id2label.items():
                idx_int = int(idx_key) if isinstance(idx_key, str) else idx_key
                if lbl == "naat":
                    self.naat_idx = idx_int
                elif lbl == "explanation":
                    self.expl_idx = idx_int
            
            if self.naat_idx is None:
                self.naat_idx = 0
            if self.expl_idx is None:
                self.expl_idx = 1
                
            logger.info(f"Model loaded successfully. Labels: {self.id2label}")
            self.use_rules = False
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            logger.info("Falling back to rule-based classification")
            self.use_rules = True
    
    def preprocess_audio(self, audio: np.ndarray, sample_rate: int = 16000, chunk_duration: int = 5) -> torch.Tensor:
        """Preprocess audio for model input"""
        # Ensure audio is the right length
        max_length = sample_rate * chunk_duration
        if len(audio) > max_length:
            audio = audio[:max_length]
        elif len(audio) < max_length:
            # Pad short audio
            audio = np.pad(audio, (0, max_length - len(audio)))
        
        # Use feature extractor
        inputs = self.feature_extractor(
            audio,
            sampling_rate=sample_rate,
            max_length=max_length,
            truncation=True,
            return_tensors="pt"
        )
        
        return inputs
    
    def classify_segment(self, audio: np.ndarray, sample_rate: int = 16000) -> Tuple[str, float]:
        """Classify audio segment as speech or singing"""
        if self.use_rules or self.model is None:
            return self._rule_based_classification(audio, sample_rate)
        
        try:
            inputs = self.preprocess_audio(audio, sample_rate)
            
            with torch.no_grad():
                # Move inputs to device
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                logits = self.model(**inputs).logits
                probabilities = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()
            
            naat_prob = probabilities[self.naat_idx]
            expl_prob = probabilities[self.expl_idx]
            
            if expl_prob > naat_prob:
                return "speech", float(expl_prob)
            else:
                return "singing", float(naat_prob)
        
        except Exception as e:
            logger.error(f"Classification error: {e}")
            return self._rule_based_classification(audio, sample_rate)
    
    def classify_audio_sliding_window(self, audio: np.ndarray, sample_rate: int = 16000, 
                                    chunk_duration: float = 5.0, hop_duration: float = 1.0) -> List[Dict]:
        """Classify audio using sliding window approach like your original script"""
        if self.use_rules or self.model is None:
            return self.classify_audio(audio, sample_rate, chunk_duration)
        
        total_duration = len(audio) / sample_rate
        num_seconds = int(np.ceil(total_duration))
        
        # Initialize vote arrays
        naat_scores = np.zeros(num_seconds)
        expl_scores = np.zeros(num_seconds)
        vote_counts = np.zeros(num_seconds)
        
        # Sliding window classification
        num_windows = max(1, int(np.ceil((total_duration - chunk_duration) / hop_duration)) + 1)
        logger.info(f"Classifying {num_windows} overlapping windows")
        
        for i in range(num_windows):
            start = i * hop_duration
            end = start + chunk_duration
            start_sample = int(start * sample_rate)
            end_sample = min(int(end * sample_rate), len(audio))
            chunk_audio = audio[start_sample:end_sample]
            
            if len(chunk_audio) < sample_rate:  # Skip chunks shorter than 1 second
                break
            
            try:
                inputs = self.preprocess_audio(chunk_audio, sample_rate, int(chunk_duration))
                
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
                    
            except Exception as e:
                logger.error(f"Error processing window {i}: {e}")
                continue
        
        # Convert to per-second chunks
        chunks = []
        for s in range(num_seconds):
            if vote_counts[s] == 0:
                continue
            avg_naat = naat_scores[s] / vote_counts[s]
            avg_expl = expl_scores[s] / vote_counts[s]
            
            if avg_expl > avg_naat:
                label = "speech"
                confidence = avg_expl
            else:
                label = "singing"
                confidence = avg_naat
            
            sec_end = min(s + 1, total_duration)
            chunks.append({
                'start': float(s),
                'end': sec_end,
                'duration': sec_end - s,
                'type': label,
                'confidence': float(confidence)
            })
        
        return chunks
    
    def classify_audio(self, audio: np.ndarray, sample_rate: int = 16000, 
                      segment_length: float = 5.0) -> List[Dict]:
        """Classify entire audio file by segments"""
        if self.model is not None and not self.use_rules:
            return self.classify_audio_sliding_window(audio, sample_rate, segment_length, 1.0)
        
        # Fallback to simple segmentation
        segments = []
        segment_samples = int(segment_length * sample_rate)
        
        for i in range(0, len(audio), segment_samples):
            segment = audio[i:i + segment_samples]
            start_time = i / sample_rate
            end_time = min((i + segment_samples) / sample_rate, len(audio) / sample_rate)
            
            if len(segment) > sample_rate * 0.5:  # At least 0.5 seconds
                class_name, confidence = self.classify_segment(segment, sample_rate)
                
                segments.append({
                    'start': start_time,
                    'end': end_time,
                    'duration': end_time - start_time,
                    'type': class_name,
                    'confidence': confidence
                })
        
        return segments
    
    def _rule_based_classification(self, audio: np.ndarray, sample_rate: int = 16000) -> Tuple[str, float]:
        """Rule-based classification as fallback"""
        import librosa
        
        # Extract features
        mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=13)
        spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=sample_rate)[0]
        zcr = librosa.feature.zero_crossing_rate(audio)[0]
        chroma = librosa.feature.chroma_stft(y=audio, sr=sample_rate)
        
        # Calculate statistics
        mfcc_mean = np.mean(mfccs, axis=1)
        spectral_centroid_mean = np.mean(spectral_centroids)
        zcr_mean = np.mean(zcr)
        chroma_var = np.var(chroma, axis=1)
        
        # Simple heuristics
        speech_score = 0
        singing_score = 0
        
        # Speech typically has:
        # - Higher zero crossing rate
        # - More variation in spectral centroid
        # - Specific MFCC patterns
        if zcr_mean > 0.1:
            speech_score += 1
        
        if spectral_centroid_mean < 2000:
            speech_score += 1
        
        # Singing typically has:
        # - More harmonic content (chroma variation)
        # - More stable pitch
        # - Different MFCC patterns
        if np.mean(chroma_var) > 0.1:
            singing_score += 1
        
        if spectral_centroid_mean > 1500:
            singing_score += 1
        
        # Energy-based features
        rms_energy = librosa.feature.rms(y=audio)[0]
        if np.std(rms_energy) < np.mean(rms_energy) * 0.3:
            singing_score += 1  # More stable energy in singing
        else:
            speech_score += 1
        
        # Determine classification
        if speech_score > singing_score:
            confidence = min(0.8, 0.5 + (speech_score - singing_score) * 0.1)
            return "speech", confidence
        else:
            confidence = min(0.8, 0.5 + (singing_score - speech_score) * 0.1)
            return "singing", confidence
    
    def classify_audio(self, audio: np.ndarray, sample_rate: int = 16000, 
                      segment_length: float = 5.0) -> List[Dict]:
        """Classify entire audio file by segments"""
        segments = []
        segment_samples = int(segment_length * sample_rate)
        
        for i in range(0, len(audio), segment_samples):
            segment = audio[i:i + segment_samples]
            start_time = i / sample_rate
            end_time = min((i + segment_samples) / sample_rate, len(audio) / sample_rate)
            
            if len(segment) > sample_rate * 0.5:  # At least 0.5 seconds
                class_name, confidence = self.classify_segment(segment, sample_rate)
                
                segments.append({
                    'start': start_time,
                    'end': end_time,
                    'duration': end_time - start_time,
                    'type': class_name,
                    'confidence': confidence
                })
        
        return segments