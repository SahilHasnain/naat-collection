import numpy as np
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class SegmentDetector:
    def __init__(self, min_segment_duration: float = 2.0, merge_threshold: float = 1.0):
        self.min_segment_duration = min_segment_duration
        self.merge_threshold = merge_threshold
    
    def merge_consecutive_segments(self, segments: List[Dict]) -> List[Dict]:
        """Merge consecutive segments of the same type"""
        if not segments:
            return []
        
        merged = []
        current_segment = segments[0].copy()
        
        for next_segment in segments[1:]:
            # Check if segments are of same type and close enough
            time_gap = next_segment['start'] - current_segment['end']
            same_type = current_segment['type'] == next_segment['type']
            close_enough = time_gap <= self.merge_threshold
            
            if same_type and close_enough:
                # Merge segments
                current_segment['end'] = next_segment['end']
                current_segment['duration'] = current_segment['end'] - current_segment['start']
                # Average confidence
                current_segment['confidence'] = (current_segment['confidence'] + next_segment['confidence']) / 2
            else:
                # Add current segment and start new one
                merged.append(current_segment)
                current_segment = next_segment.copy()
        
        # Add the last segment
        merged.append(current_segment)
        
        return merged
    
    def filter_short_segments(self, segments: List[Dict]) -> List[Dict]:
        """Remove segments shorter than minimum duration"""
        return [seg for seg in segments if seg['duration'] >= self.min_segment_duration]
    
    def smooth_segments(self, segments: List[Dict], window_size: int = 3) -> List[Dict]:
        """Apply smoothing to reduce noise in segment classification"""
        if len(segments) < window_size:
            return segments
        
        smoothed = segments.copy()
        
        for i in range(1, len(segments) - 1):
            # Look at surrounding segments
            prev_seg = segments[i-1]
            curr_seg = segments[i]
            next_seg = segments[i+1]
            
            # If current segment is different from both neighbors and short
            if (curr_seg['type'] != prev_seg['type'] and 
                curr_seg['type'] != next_seg['type'] and
                curr_seg['duration'] < self.min_segment_duration * 2):
                
                # Change to majority type
                if prev_seg['type'] == next_seg['type']:
                    smoothed[i]['type'] = prev_seg['type']
                    smoothed[i]['confidence'] = min(curr_seg['confidence'], 0.6)
        
        return smoothed
    
    def detect_speech_segments(self, segments: List[Dict]) -> List[Dict]:
        """Extract only speech segments from all segments"""
        speech_segments = [seg for seg in segments if seg['type'] == 'speech']
        
        # Apply post-processing
        speech_segments = self.merge_consecutive_segments(speech_segments)
        speech_segments = self.filter_short_segments(speech_segments)
        
        return speech_segments
    
    def create_timeline(self, segments: List[Dict], total_duration: float) -> List[Dict]:
        """Create complete timeline with gaps filled"""
        if not segments:
            return [{
                'start': 0,
                'end': total_duration,
                'duration': total_duration,
                'type': 'singing',
                'confidence': 0.5
            }]
        
        timeline = []
        current_time = 0
        
        for segment in segments:
            # Add gap before segment if exists
            if segment['start'] > current_time:
                gap_type = 'singing'  # Assume gaps are singing
                timeline.append({
                    'start': current_time,
                    'end': segment['start'],
                    'duration': segment['start'] - current_time,
                    'type': gap_type,
                    'confidence': 0.5
                })
            
            # Add the segment
            timeline.append(segment)
            current_time = segment['end']
        
        # Add final gap if exists
        if current_time < total_duration:
            timeline.append({
                'start': current_time,
                'end': total_duration,
                'duration': total_duration - current_time,
                'type': 'singing',
                'confidence': 0.5
            })
        
        return timeline
    
    def calculate_statistics(self, segments: List[Dict], total_duration: float) -> Dict:
        """Calculate statistics about the segments"""
        speech_segments = [seg for seg in segments if seg['type'] == 'speech']
        singing_segments = [seg for seg in segments if seg['type'] == 'singing']
        
        total_speech_duration = sum(seg['duration'] for seg in speech_segments)
        total_singing_duration = sum(seg['duration'] for seg in singing_segments)
        
        return {
            'total_duration': total_duration,
            'total_speech_duration': total_speech_duration,
            'total_singing_duration': total_singing_duration,
            'speech_percentage': (total_speech_duration / total_duration) * 100 if total_duration > 0 else 0,
            'singing_percentage': (total_singing_duration / total_duration) * 100 if total_duration > 0 else 0,
            'num_speech_segments': len(speech_segments),
            'num_singing_segments': len(singing_segments),
            'avg_speech_confidence': np.mean([seg['confidence'] for seg in speech_segments]) if speech_segments else 0,
            'avg_singing_confidence': np.mean([seg['confidence'] for seg in singing_segments]) if singing_segments else 0
        }
    
    def process_segments(self, raw_segments: List[Dict], total_duration: float) -> Dict:
        """Complete segment processing pipeline"""
        logger.info(f"Processing {len(raw_segments)} raw segments")
        
        # Step 1: Smooth segments to reduce noise
        smoothed = self.smooth_segments(raw_segments)
        logger.info(f"After smoothing: {len(smoothed)} segments")
        
        # Step 2: Merge consecutive segments of same type
        merged = self.merge_consecutive_segments(smoothed)
        logger.info(f"After merging: {len(merged)} segments")
        
        # Step 3: Filter out very short segments
        filtered = self.filter_short_segments(merged)
        logger.info(f"After filtering: {len(filtered)} segments")
        
        # Step 4: Create complete timeline
        timeline = self.create_timeline(filtered, total_duration)
        
        # Step 5: Extract speech segments for cutting
        speech_segments = self.detect_speech_segments(timeline)
        
        # Step 6: Calculate statistics
        stats = self.calculate_statistics(timeline, total_duration)
        
        return {
            'all_segments': timeline,
            'speech_segments': speech_segments,
            'statistics': stats
        }