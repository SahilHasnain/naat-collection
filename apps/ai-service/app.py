from flask import Flask, request, jsonify
import torch
import numpy as np
import requests
import tempfile
import os
import logging
from audio_processor import AudioProcessor
from classifier import AudioClassifier
from segment_detector import SegmentDetector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize components
audio_processor = AudioProcessor(sample_rate=16000)
audio_classifier = AudioClassifier(model_name="sahilhasnain07/naat-classifier-model")  # Your trained model
segment_detector = SegmentDetector(min_segment_duration=5.0, merge_threshold=10.0)  # Match your script settings

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "device": str(audio_classifier.device),
        "torch_version": torch.__version__
    })

@app.route('/detect-segments', methods=['POST'])
def detect_segments():
    try:
        data = request.json
        audio_url = data.get('audio_url')
        
        if not audio_url:
            return jsonify({"error": "audio_url required"}), 400
        
        logger.info(f"Processing audio from: {audio_url}")
        
        # Download audio
        response = requests.get(audio_url, timeout=30)
        response.raise_for_status()
        
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp_file:
            tmp_file.write(response.content)
            tmp_path = tmp_file.name
        
        try:
            # Load and preprocess audio
            logger.info("Loading audio file")
            audio, duration = audio_processor.load_audio(tmp_path)
            audio = audio_processor.preprocess_audio(audio)
            
            logger.info(f"Audio duration: {duration:.2f} seconds")
            
            # Classify audio segments using sliding window (like your script)
            logger.info("Classifying audio segments with sliding window")
            raw_segments = audio_classifier.classify_audio_sliding_window(
                audio, 
                sample_rate=16000, 
                chunk_duration=5.0,
                hop_duration=1.0
            )
            
            logger.info(f"Found {len(raw_segments)} raw segments")
            
            # Process segments
            result = segment_detector.process_segments(raw_segments, duration)
            
            # Format response to match expected structure
            response_data = {
                "duration": duration,
                "speechSegments": result['speech_segments'],
                "allSegments": result['all_segments'],
                "totalSpeechDuration": result['statistics']['total_speech_duration'],
                "totalSingingDuration": result['statistics']['total_singing_duration'],
                "statistics": result['statistics']
            }
            
            logger.info(f"Detected {len(result['speech_segments'])} speech segments")
            logger.info(f"Speech: {result['statistics']['total_speech_duration']:.1f}s, "
                       f"Singing: {result['statistics']['total_singing_duration']:.1f}s")
            
            return jsonify(response_data)
            
        finally:
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
    except requests.RequestException as e:
        logger.error(f"Failed to download audio: {e}")
        return jsonify({"error": f"Failed to download audio: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"Processing error: {e}", exc_info=True)
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

@app.route('/test-classification', methods=['POST'])
def test_classification():
    """Test endpoint for debugging classification"""
    try:
        data = request.json
        audio_url = data.get('audio_url')
        segment_length = data.get('segment_length', 5.0)
        
        if not audio_url:
            return jsonify({"error": "audio_url required"}), 400
        
        # Download and process audio
        response = requests.get(audio_url, timeout=30)
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp_file:
            tmp_file.write(response.content)
            tmp_path = tmp_file.name
        
        try:
            audio, duration = audio_processor.load_audio(tmp_path)
            
            # Get detailed segment analysis
            segments = audio_classifier.classify_audio(audio, segment_length=segment_length)
            
            # Add feature analysis for first few segments
            detailed_segments = []
            for i, segment in enumerate(segments[:5]):  # First 5 segments only
                start_sample = int(segment['start'] * 16000)
                end_sample = int(segment['end'] * 16000)
                segment_audio = audio[start_sample:end_sample]
                
                features = audio_processor.extract_features(segment_audio)
                
                detailed_segments.append({
                    **segment,
                    'features': {
                        'mfcc_mean': features['mfccs'].mean(axis=1).tolist(),
                        'spectral_centroid_mean': float(features['spectral_centroids'].mean()),
                        'zcr_mean': float(features['zcr'].mean()),
                        'tempo': float(features['tempo'])
                    }
                })
            
            return jsonify({
                'duration': duration,
                'total_segments': len(segments),
                'detailed_segments': detailed_segments,
                'summary': {
                    'speech_count': len([s for s in segments if s['type'] == 'speech']),
                    'singing_count': len([s for s in segments if s['type'] == 'singing'])
                }
            })
            
        finally:
            os.unlink(tmp_path)
            
    except Exception as e:
        logger.error(f"Test classification error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting AI Detection Service")
    logger.info(f"Using device: {audio_classifier.device}")
    app.run(host='0.0.0.0', port=8000, debug=False)