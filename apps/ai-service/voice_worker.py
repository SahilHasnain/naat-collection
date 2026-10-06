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
from appwrite.input_file import InputFile
from appwrite.query import Query
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage
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
APPWRITE_VARIANTS_TABLE_ID = os.getenv("APPWRITE_VOICE_VARIANTS_TABLE_ID", "voice_variants")
APPWRITE_AUDIO_BUCKET_ID = os.getenv("APPWRITE_AUDIO_BUCKET_ID", "audio-files")
POLL_INTERVAL_SECONDS = int(os.getenv("AI_VOICE_POLL_INTERVAL_SECONDS", "10"))
LEASE_SECONDS = int(os.getenv("AI_VOICE_LEASE_SECONDS", "1800"))
WORKER_ID = os.getenv("AI_VOICE_WORKER_ID", f"{socket.gethostname()}-voice")

databases = None
storage = None


def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def iso_in(seconds):
    return (datetime.now(timezone.utc) + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


def init_appwrite():
    global databases, storage
    client = Client()
    client.set_endpoint(APPWRITE_ENDPOINT)
    client.set_project(APPWRITE_PROJECT_ID)
    client.set_key(APPWRITE_API_KEY)
    databases = Databases(client)
    storage = Storage(client)


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


def upload_audio(file_path, job_id):
    file_id = str(uuid.uuid4())
    last_progress = 0

    def on_progress(event):
        nonlocal last_progress
        upload_progress = int(event.get("progress", 0))
        progress = 85 + int(upload_progress * 0.14)
        if progress > last_progress:
            update_job(job_id, {"progress": progress, "leaseUntil": iso_in(LEASE_SECONDS)})
            last_progress = progress

    last_error = None
    for attempt in range(1, 6):
        try:
            result = storage.create_file(
                APPWRITE_AUDIO_BUCKET_ID,
                file_id,
                InputFile.from_path(file_path),
                on_progress=on_progress,
            )
            return result["$id"]
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Upload attempt %s/5 failed for job %s; retrying resumable upload: %s",
                attempt,
                job_id,
                exc,
            )
            update_job(job_id, {"leaseUntil": iso_in(LEASE_SECONDS)})
            if attempt < 5:
                time.sleep(min(60, 10 * attempt))

    raise RuntimeError(f"Appwrite upload failed after 5 attempts: {last_error}")


def audio_duration_seconds(input_path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", input_path],
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        return 0
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0


def update_variant(job_id, payload):
    response = requests.patch(
        f"{APPWRITE_ENDPOINT}/tablesdb/{APPWRITE_DATABASE_ID}/tables/{APPWRITE_VARIANTS_TABLE_ID}/rows/{job_id}",
        headers={
            "X-Appwrite-Project": APPWRITE_PROJECT_ID,
            "X-Appwrite-Key": APPWRITE_API_KEY,
            "Content-Type": "application/json",
        },
        json={"data": payload},
        timeout=60,
    )
    if response.status_code == 404:
        logger.warning("Voice variant row %s does not exist", job_id)
        return None
    response.raise_for_status()
    return response.json()


def pitch_shift(input_path, output_path, semitones, job_id):
    ratio = 2 ** (float(semitones) / 12)
    sample_rate = 44100
    command = [
        "ffmpeg", "-y", "-i", input_path,
        "-filter:a", f"asetrate={sample_rate * ratio},aresample={sample_rate},atempo={1 / ratio}",
        "-vn", "-c:a", "aac", "-b:a", "256k",
        "-progress", "pipe:1", "-nostats", output_path,
    ]
    duration = audio_duration_seconds(input_path)
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    last_update = 0
    progress_output = []
    for line in process.stdout or []:
        key, _, value = line.strip().partition("=")
        if key == "out_time_ms" and duration > 0:
            ratio_complete = min(1, (float(value) / 1_000_000) / duration)
            progress = 35 + int(ratio_complete * 50)
            if progress > last_update:
                update_job(job_id, {"progress": progress, "leaseUntil": iso_in(LEASE_SECONDS)})
                last_update = progress
        elif key == "progress":
            progress_output.append(value)

    stderr = process.stderr.read() if process.stderr else ""
    return_code = process.wait()
    if return_code:
        raise RuntimeError(f"ffmpeg pitch shifting failed: {stderr[-1000:]}")


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
        update_variant(job_id, {"status": "running", "error": ""})
        update_job(job_id, {"progress": 10, "leaseUntil": iso_in(LEASE_SECONDS)})
        file_info = get_audio_file_info(job["audioId"])
        extension = os.path.splitext(file_info.get("name", ""))[1] or ".audio"
        with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as source_file:
            source_file.write(download_audio(job["audioId"]))
            source_path = source_file.name

        update_job(job_id, {"progress": 35, "leaseUntil": iso_in(LEASE_SECONDS)})
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as output_file:
            output_path = output_file.name

        preset = job.get("voicePreset", "younger")
        semitones = float(job.get("pitchSemitones", {"subtle": 2, "younger": 4, "high": 6}.get(preset, 4)))
        pitch_shift(source_path, output_path, semitones, job_id)
        update_job(job_id, {"progress": 85, "leaseUntil": iso_in(LEASE_SECONDS)})
        output_audio_id = upload_audio(output_path, job_id)
        update_job(job_id, {
            "status": "done",
            "progress": 100,
            "outputAudioId": output_audio_id,
            "resultJson": json.dumps({"pitchSemitones": semitones, "voicePreset": preset}),
            "finishedAt": iso_now(),
            "leaseUntil": iso_now(),
            "error": "",
        })
        update_variant(job_id, {"status": "done", "outputAudioId": output_audio_id, "error": ""})
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
        try:
            update_variant(job_id, {"status": "failed", "error": str(exc)[:5000]})
        except Exception:
            logger.exception("Failed to update voice variant %s", job_id)
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
