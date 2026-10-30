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

Run `npm run provision:appwrite -- --project <brand> --apply` to provision the
`ai_jobs` collection and the `voice_variants` table alongside the rest of the
Appwrite schema. Configure the function with the same database, API key, and
resource IDs used by the worker.

## "Teenage voice ready" filter

The home and search screens expose a **Teenage** filter that lists only naats
whose `high` preset voice already exists, so playback starts immediately with no
processing wait.

- Availability source: `ai_jobs` rows with `type = voice-transform`,
  `status = done`, `voicePreset = high`, and a non-null `outputAudioId`. This is
  the same lookup the player performs before playing, so a filtered naat never
  triggers a new job.
- Matching: a naat is included when its preferred audio ID
  (`cutAudio || audioId`) is one of the ready source audio IDs.
- Lookup and behaviour live in `apps/mobile/services/voiceTransform.ts`
  (`getReadyVoiceAudioIds`), `hooks/useTeenageReady.ts`, `hooks/useNaats.ts`, and
  `hooks/useSearch.ts`. The ready set is cached for 5 minutes and invalidated
  when a transform finishes in the player.
- Because most naats have no ready voice, the home list scans larger raw pages
  while the filter is active to fill a page with matches, and uses `latest`
  ordering instead of the For You ordering.
