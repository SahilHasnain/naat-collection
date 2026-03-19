from flask import Flask, request, jsonify
import torch
import numpy as np
import requests
import tempfile
import os
import logging
import json
import socket
import threading
import time
from datetime import datetime, timedelta, timezone
from audio_processor import AudioProcessor
from classifier_fixed import AudioClassifier
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize components
audio_processor = AudioProcessor(sample_rate=16000)
audio_classifier = AudioClassifier(model_name="sahilhasnain07/naat-classifier-model")

APPWRITE_ENDPOINT = os.getenv("APPWRITE_ENDPOINT", "").rstrip("/")
APPWRITE_PROJECT_ID = os.getenv("APPWRITE_PROJECT_ID", "")
APPWRITE_API_KEY = os.getenv("APPWRITE_API_KEY", "")
APPWRITE_DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID", "")
APPWRITE_AI_JOBS_COLLECTION_ID = os.getenv("APPWRITE_AI_JOBS_COLLECTION_ID", "ai_jobs")
APPWRITE_AUDIO_BUCKET_ID = os.getenv("APPWRITE_AUDIO_BUCKET_ID", "audio-files")
POLL_INTERVAL_SECONDS = int(os.getenv("AI_JOB_POLL_INTERVAL_SECONDS", "10"))
LEASE_SECONDS = int(os.getenv("AI_JOB_LEASE_SECONDS", "120"))
WORKER_ID = os.getenv("AI_WORKER_ID", f"{socket.gethostname()}-manual-cut")
worker_lock = threading.Lock()

def appwrite_headers():
    return {
        "X-Appwrite-Project": APPWRITE_PROJECT_ID,
        "X-Appwrite-Key": APPWRITE_API_KEY,
        "Content-Type": "application/json",
    }

def appwrite_base_url():
    return f"{APPWRITE_ENDPOINT}/databases/{APPWRITE_DATABASE_ID}/collections/{APPWRITE_AI_JOBS_COLLECTION_ID}/documents"

def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def iso_in(seconds):
    return (datetime.now(timezone.utc) + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")

def fetch_documents(queries):
    response = requests.get(
        appwrite_base_url(),
        headers=appwrite_headers(),
        params=[("queries[]", query) for query in queries],
        timeout=30,
    )
    if not response.ok:
        logger.error(f"[worker] Appwrite listDocuments failed: {response.status_code} {response.text}")
        response.raise_for_status()
    return response.json().get("documents", [])

def update_job(job_id, payload):
    response = requests.patch(
        f"{appwrite_base_url()}/{job_id}",
        headers=appwrite_headers(),
        data=json.dumps(payload),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()

def claim_next_job():
    pending_queries = [
        'equal("type",["manual-cut-detect"])',
        'equal("status",["pending"])',
        'limit(25)',
    ]
    documents = fetch_documents(pending_queries)
    if not documents:
        expired_queries = [
            'equal("type",["manual-cut-detect"])',
            'equal("status",["running"])',
            f'lessThan("leaseUntil","{iso_now()}")',
            'limit(25)',
        ]
        documents = fetch_documents(expired_queries)

    if not documents:
        return None

    documents.sort(key=lambda item: item.get("$createdAt", ""))
    job = documents[0]
    now = iso_now()
    lease_until = iso_in(LEASE_SECONDS)
    update_job(job["$id"], {
        "status": "running",
        "workerId": WORKER_ID,
        "startedAt": now,
        "leaseUntil": lease_until,
        "attempts": int(job.get("attempts", 0)) + 1,
        "progress": 5,
        "error": "",
    })
    job["status"] = "running"
    job["workerId"] = WORKER_ID
    job["leaseUntil"] = lease_until
    job["attempts"] = int(job.get("attempts", 0)) + 1
    return job

def heartbeat(job_id, progress=None):
    payload = {
        "leaseUntil": iso_in(LEASE_SECONDS),
    }
    if progress is not None:
        payload["progress"] = progress
    update_job(job_id, payload)

def download_audio_from_appwrite(audio_id):
    response = requests.get(
        f"{APPWRITE_ENDPOINT}/storage/buckets/{APPWRITE_AUDIO_BUCKET_ID}/files/{audio_id}/download",
        headers={
            "X-Appwrite-Project": APPWRITE_PROJECT_ID,
            "X-Appwrite-Key": APPWRITE_API_KEY,
        },
        timeout=120,
    )
    response.raise_for_status()
    return response.content

def process_job(job):
    job_id = job["$id"]
    tmp_path = None

    try:
        logger.info(f"[worker] Processing job {job_id} for naat {job['naatId']}")
        heartbeat(job_id, 10)

        audio_bytes = download_audio_from_appwrite(job["audioId"])
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_path = tmp_file.name

        heartbeat(job_id, 35)
        audio, duration = audio_processor.load_audio(tmp_path)
        audio = audio_processor.preprocess_audio(audio)

        heartbeat(job_id, 70)
        result = audio_classifier.classify_audio(audio)

        update_job(job_id, {
            "status": "done",
            "progress": 100,
            "resultJson": json.dumps(result),
            "finishedAt": iso_now(),
            "leaseUntil": iso_now(),
            "error": "",
        })
        logger.info(f"[worker] Job {job_id} completed successfully")
    except Exception as exc:
        logger.error(f"[worker] Job {job_id} failed: {exc}", exc_info=True)
        update_job(job_id, {
            "status": "failed",
            "progress": 100,
            "error": str(exc)[:5000],
            "finishedAt": iso_now(),
            "leaseUntil": iso_now(),
        })
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

def worker_loop():
    required = [
        APPWRITE_ENDPOINT,
        APPWRITE_PROJECT_ID,
        APPWRITE_API_KEY,
        APPWRITE_DATABASE_ID,
        APPWRITE_AI_JOBS_COLLECTION_ID,
    ]
    if not all(required):
        logger.warning("[worker] Appwrite job worker disabled: missing Appwrite env vars")
        return

    logger.info(f"[worker] AI job worker started as {WORKER_ID}")

    while True:
        try:
            if worker_lock.acquire(blocking=False):
                try:
                    job = claim_next_job()
                    if job:
                        process_job(job)
                finally:
                    worker_lock.release()
            time.sleep(POLL_INTERVAL_SECONDS)
        except Exception as exc:
            logger.error(f"[worker] Poll loop error: {exc}", exc_info=True)
            time.sleep(POLL_INTERVAL_SECONDS)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "device": str(audio_classifier.device),
        "torch_version": torch.__version__
    })

@app.route('/detect-segments', methods=['POST'])
def detect_segments():
    tmp_path = None
    try:
        uploaded_audio = request.files.get('audio')

        if uploaded_audio:
            suffix = os.path.splitext(uploaded_audio.filename or '')[1] or '.mp3'
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
                uploaded_audio.save(tmp_file)
                tmp_path = tmp_file.name
            logger.info("Processing uploaded audio file")
        else:
            data = request.get_json(silent=True) or {}
            audio_url = data.get('audio_url')

            if not audio_url:
                return jsonify({"error": "audio_url or audio file required"}), 400

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
    threading.Thread(target=worker_loop, daemon=True).start()
    app.run(host='0.0.0.0', port=8000, debug=False)
