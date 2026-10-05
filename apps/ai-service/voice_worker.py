import json
import logging
import os
import socket
import subprocess
import tempfile
import time
import uuid
from datetime import datetime, timedelta, timezone

import requests
from appwrite.client import Client
from appwrite.query import Query
from appwrite.services.databases import Databases
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("voice-worker")

APPWRITE_ENDPOINT = os.getenv("APPWRITE_ENDPOINT", "").rstrip("/")
APPWRITE_PROJECT_ID = os.getenv("APPWRITE_PROJECT_ID", "")
APPWRITE_API_KEY = os.getenv("APPWRITE_API_KEY", "")
APPWRITE_DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID", "")
APPWRITE_JOBS_COLLECTION_ID = os.getenv("APPWRITE_AI_JOBS_COLLECTION_ID", "ai_jobs")
APPWRITE_AUDIO_BUCKET_ID = os.getenv("APPWRITE_AUDIO_BUCKET_ID", "audio-files")
POLL_INTERVAL_SECONDS = int(os.getenv("AI_VOICE_POLL_INTERVAL_SECONDS", "10"))
LEASE_SECONDS = int(os.getenv("AI_VOICE_LEASE_SECONDS", "1800"))
WORKER_ID = os.getenv("AI_VOICE_WORKER_ID", f"{socket.gethostname()}-voice")

databases = None


def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def iso_in(seconds):
    return (datetime.now(timezone.utc) + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


def init_appwrite():
    global databases
    client = Client()
    client.set_endpoint(APPWRITE_ENDPOINT)
    client.set_project(APPWRITE_PROJECT_ID)
    client.set_key(APPWRITE_API_KEY)
    databases = Databases(client)


def update_job(job_id, payload):
    return databases.update_document(
        APPWRITE_DATABASE_ID,
        APPWRITE_JOBS_COLLECTION_ID,
        job_id,
        payload,
    )


def get_audio_file_info(audio_id):
    response = requests.get(
        f"{APPWRITE_ENDPOINT}/storage/buckets/{APPWRITE_AUDIO_BUCKET_ID}/files/{audio_id}",
        headers={
            "X-Appwrite-Project": APPWRITE_PROJECT_ID,
            "X-Appwrite-Key": APPWRITE_API_KEY,
        },
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def download_audio(audio_id):
    response = requests.get(
        f"{APPWRITE_ENDPOINT}/storage/buckets/{APPWRITE_AUDIO_BUCKET_ID}/files/{audio_id}/download",
        headers={
            "X-Appwrite-Project": APPWRITE_PROJECT_ID,
            "X-Appwrite-Key": APPWRITE_API_KEY,
        },
        timeout=300,
    )
    response.raise_for_status()
    return response.content


def upload_audio(file_path):
    file_id = str(uuid.uuid4())
    with open(file_path, "rb") as audio_file:
        response = requests.post(
            f"{APPWRITE_ENDPOINT}/storage/buckets/{APPWRITE_AUDIO_BUCKET_ID}/files",
            headers={
                "X-Appwrite-Project": APPWRITE_PROJECT_ID,
                "X-Appwrite-Key": APPWRITE_API_KEY,
            },
            data={"fileId": file_id},
            files={"file": (f"voice-{file_id}.m4a", audio_file, "audio/mp4")},
            timeout=300,
        )
    response.raise_for_status()
    return file_id


def pitch_shift(input_path, output_path, semitones):
    ratio = 2 ** (float(semitones) / 12)
    sample_rate = 44100
    command = [
        "ffmpeg", "-y", "-i", input_path,
        "-filter:a", f"asetrate={sample_rate * ratio},aresample={sample_rate},atempo={1 / ratio}",
        "-vn", "-c:a", "aac", "-b:a", "256k", output_path,
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError(f"ffmpeg pitch shifting failed: {result.stderr[-1000:]}")


def claim_next_job():
    response = databases.list_documents(
        APPWRITE_DATABASE_ID,
        APPWRITE_JOBS_COLLECTION_ID,
        [
            Query.equal("type", "voice-transform"),
            Query.equal("status", "pending"),
            Query.order_asc("$createdAt"),
            Query.limit(1),
        ],
    )
    documents = response.get("documents", [])
    if not documents:
        return None

    job = documents[0]
    update_job(job["$id"], {
        "status": "running",
        "workerId": WORKER_ID,
        "startedAt": iso_now(),
        "leaseUntil": iso_in(LEASE_SECONDS),
        "attempts": int(job.get("attempts", 0)) + 1,
        "progress": 5,
        "error": "",
    })
    return job


def process_job(job):
    job_id = job["$id"]
    source_path = None
    output_path = None
    try:
        update_job(job_id, {"progress": 10, "leaseUntil": iso_in(LEASE_SECONDS)})
        file_info = get_audio_file_info(job["audioId"])
        extension = os.path.splitext(file_info.get("name", ""))[1] or ".audio"
        with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as source_file:
            source_file.write(download_audio(job["audioId"]))
            source_path = source_file.name

        update_job(job_id, {"progress": 35, "leaseUntil": iso_in(LEASE_SECONDS)})
        with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as output_file:
            output_path = output_file.name

        preset = job.get("voicePreset", "younger")
        semitones = float(job.get("pitchSemitones", {"subtle": 2, "younger": 4, "high": 6}.get(preset, 4)))
        pitch_shift(source_path, output_path, semitones)
        update_job(job_id, {"progress": 85, "leaseUntil": iso_in(LEASE_SECONDS)})
        output_audio_id = upload_audio(output_path)
        update_job(job_id, {
            "status": "done",
            "progress": 100,
            "outputAudioId": output_audio_id,
            "resultJson": json.dumps({"pitchSemitones": semitones, "voicePreset": preset}),
            "finishedAt": iso_now(),
            "leaseUntil": iso_now(),
            "error": "",
        })
        logger.info("Completed voice job %s", job_id)
    except Exception as exc:
        logger.error("Voice job %s failed: %s", job_id, exc, exc_info=True)
        update_job(job_id, {
            "status": "failed",
            "progress": 100,
            "error": str(exc)[:5000],
            "finishedAt": iso_now(),
            "leaseUntil": iso_now(),
        })
    finally:
        for path in (source_path, output_path):
            if path and os.path.exists(path):
                os.unlink(path)


def main():
    required = {
        "APPWRITE_ENDPOINT": APPWRITE_ENDPOINT,
        "APPWRITE_PROJECT_ID": APPWRITE_PROJECT_ID,
        "APPWRITE_API_KEY": APPWRITE_API_KEY,
        "APPWRITE_DATABASE_ID": APPWRITE_DATABASE_ID,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise RuntimeError(f"Missing environment variables: {missing}")

    init_appwrite()
    logger.info("Voice worker started as %s", WORKER_ID)
    while True:
        job = claim_next_job()
        if job:
            logger.info("Claimed voice job %s", job["$id"])
            process_job(job)
        else:
            time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
