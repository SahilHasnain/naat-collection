# Voice Transform Pipeline

The voice transform feature uses Appwrite for job orchestration and the existing
AI service for FFmpeg processing.

## Flow

1. Call the `create-voice-transform-job` Appwrite Function with `audioId` and a
   preset: `subtle`, `younger`, or `high`.
2. The function creates a `voice-transform` document in `ai_jobs`.
3. The AI service claims the job using its existing lease/polling loop.
4. The worker downloads the source file, shifts pitch while preserving duration,
   uploads an AAC/M4A result, and writes `outputAudioId` to the job.

## Presets

| Preset | Pitch shift |
| --- | ---: |
| `subtle` | +2 semitones |
| `younger` | +4 semitones |
| `high` | +6 semitones |

This first implementation is classic DSP pitch shifting. It does not perform
voice cloning or formant conversion, so the original recording is preserved and
the result remains suitable for caching and offline playback.

## Required setup

Run `scripts/setup/setup-ai-jobs-collection.js` once for each Appwrite project
to add the optional voice-transform attributes. Configure the function with the
same database, API key, and `ai_jobs` collection used by the worker.
