# Manual Audio Cut Feature - Implementation Plan

## Overview

Admin manually cuts explanation parts from naats by specifying timestamps, previews the result, and approves/rejects.

## Tech Stack

- Next.js 14 (App Router)
- Appwrite (Database + Storage)
- FFmpeg (server-side audio cutting)

## Workflow

1. **Select Naat** → Admin picks a naat from list (filter: has audioId, no cutAudio)
2. **Input Timestamps** → Admin enters start/end times for parts to REMOVE (explanation segments)
3. **Cut Audio** → Server uses FFmpeg to cut and create preview in temp bucket
4. **Preview** → Admin listens to cut audio
5. **Approve** → Upload to main bucket, update `cutAudio` field
6. **Reject** → Delete temp file

## Components

### Frontend (`/admin/manual-cut`)

- Naat selector (dropdown/search)
- Audio player (original)
- Timestamp input form (multiple segments)
- Cut button → API call
- Preview player (cut audio)
- Approve/Reject buttons

### API Routes

- `POST /api/admin/cut-audio` → Cut audio, save to temp bucket, return temp file ID
- `POST /api/admin/approve-cut` → Move temp to main bucket, update DB
- `DELETE /api/admin/reject-cut` → Delete temp file

### Backend Logic

- FFmpeg cutting (reuse from `ai-cut-audio.js`)
- Temp bucket for previews
- Main bucket for approved cuts

## Database Schema

No changes needed. Uses existing `cutAudio` field in Naats collection.

## File Structure

```
apps/web/
├── app/
│   └── admin/
│       └── manual-cut/
│           └── page.tsx
├── components/
│   └── admin/
│       └── ManualCutClient.tsx
└── app/api/
    └── admin/
        ├── cut-audio/
        │   └── route.ts
        ├── approve-cut/
        │   └── route.ts
        └── reject-cut/
            └── route.ts
```

## Implementation Steps

1. Create API routes (cut, approve, reject)
2. Build UI component with timestamp inputs
3. Add audio players (original + preview)
4. Wire up approve/reject flow
5. Add temp bucket cleanup logic

## Notes

- Reuse FFmpeg logic from `scripts/audio-processing/ai-cut-audio.js`
- Temp files auto-expire after 24h (Appwrite bucket setting)
- Admin route needs auth in production
