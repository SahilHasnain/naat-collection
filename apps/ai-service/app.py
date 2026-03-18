from flask import Flask, request, jsonify
import torch
import numpy as np
import requests
import tempfile
import os
import logging
from audio_processor import AudioProcessor
from classifier_fixed import AudioClassifier

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize components
audio_processor = AudioProcessor(sample_rate=16000)
audio_classifier = AudioClassifier(model_name="sahilhasnain07/naat-classifier-model")

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
            
            # Classify audio using EXACT original script logic
            logger.info("Classifying audio segments")
            result = audio_classifier.classify_audio(audio)
            
            logger.info(f"Detected {len(result['speechSegments'])} speech segments")
            logger.info(f"Speech: {result['totalSpeechDuration']}s, "
                       f"Singing: {result['totalSingingDuration']}s")
            
            return jsonify(result)
            
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
        
        if not audio_url:
            return jsonify({"error": "audio_url required"}), 400
        
        # Download and process audio
        response = requests.get(audio_url, timeout=30)
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp_file:
            tmp_file.write(response.content)
            tmp_path = tmp_file.name
        
        try:
            audio, duration = audio_processor.load_audio(tmp_path)
            result = audio_classifier.classify_audio(audio)
            
            return jsonify({
                'duration': duration,
                'result': result
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