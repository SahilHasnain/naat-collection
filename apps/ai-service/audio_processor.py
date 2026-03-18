import librosa
import numpy as np
import webrtcvad
import struct
from scipy import signal
from typing import List, Tuple, Dict

class AudioProcessor:
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self.vad = webrtcvad.Vad(2)  # Aggressiveness level 0-3
        
    def load_audio(self, file_path: str) -> Tuple[np.ndarray, float]:
        """Load audio file and return audio array and duration"""
        audio, sr = librosa.load(file_path, sr=self.sample_rate)
        duration = len(audio) / sr
        return audio, duration
    
    def preprocess_audio(self, audio: np.ndarray) -> np.ndarray:
        """Normalize and preprocess audio"""
        # Normalize audio
        audio = librosa.util.normalize(audio)
        
        # Apply pre-emphasis filter
        audio = signal.lfilter([1, -0.97], [1], audio)
        
        return audio
    
    def detect_voice_activity(self, audio: np.ndarray) -> List[Tuple[float, float]]:
        """Use WebRTC VAD to detect voice activity"""
        # Convert to 16-bit PCM
        audio_int16 = (audio * 32767).astype(np.int16)
        
        # Frame size for VAD (10, 20, or 30 ms)
        frame_duration = 30  # ms
        frame_size = int(self.sample_rate * frame_duration / 1000)
        
        voice_segments = []
        current_start = None
        
        for i in range(0, len(audio_int16) - frame_size, frame_size):
            frame = audio_int16[i:i + frame_size]
            
            # Convert to bytes for VAD
            frame_bytes = struct.pack(f'{len(frame)}h', *frame)
            
            try:
                is_speech = self.vad.is_speech(frame_bytes, self.sample_rate)
                time_stamp = i / self.sample_rate
                
                if is_speech and current_start is None:
                    current_start = time_stamp
                elif not is_speech and current_start is not None:
                    voice_segments.append((current_start, time_stamp))
                    current_start = None
            except:
                continue
        
        # Handle case where speech continues to end
        if current_start is not None:
            voice_segments.append((current_start, len(audio_int16) / self.sample_rate))
        
        return voice_segments
    
    def extract_features(self, audio: np.ndarray, window_size: int = 1024, hop_length: int = 512) -> Dict:
        """Extract audio features for classification"""
        # MFCC features
        mfccs = librosa.feature.mfcc(y=audio, sr=self.sample_rate, n_mfcc=13)
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=self.sample_rate)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=audio, sr=self.sample_rate)[0]
        spectral_bandwidth = librosa.feature.spectral_bandwidth(y=audio, sr=self.sample_rate)[0]
        
        # Zero crossing rate
        zcr = librosa.feature.zero_crossing_rate(audio)[0]
        
        # Chroma features
        chroma = librosa.feature.chroma_stft(y=audio, sr=self.sample_rate)
        
        # Tempo and beat
        tempo, beats = librosa.beat.beat_track(y=audio, sr=self.sample_rate)
        
        return {
            'mfccs': mfccs,
            'spectral_centroids': spectral_centroids,
            'spectral_rolloff': spectral_rolloff,
            'spectral_bandwidth': spectral_bandwidth,
            'zcr': zcr,
            'chroma': chroma,
            'tempo': tempo,
            'beats': beats
        }
    
    def segment_audio(self, audio: np.ndarray, segment_length: float = 5.0) -> List[Tuple[np.ndarray, float, float]]:
        """Split audio into segments for processing"""
        segment_samples = int(segment_length * self.sample_rate)
        segments = []
        
        for i in range(0, len(audio), segment_samples):
            segment = audio[i:i + segment_samples]
            start_time = i / self.sample_rate
            end_time = min((i + segment_samples) / self.sample_rate, len(audio) / self.sample_rate)
            
            if len(segment) > self.sample_rate * 0.5:  # At least 0.5 seconds
                segments.append((segment, start_time, end_time))
        
        return segments