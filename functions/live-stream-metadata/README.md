# Live Stream Metadata API

Returns current track information for the live stream.

## Endpoint

```
GET /v1/functions/{functionId}/executions
```

## Response

```json
{
  "success": true,
  "currentTrack": {
    "id": "naat123",
    "title": "Beautiful Naat",
    "duration": 300,
    "thumbnailUrl": "https://...",
    "startedAt": "2024-03-12T10:00:00.000Z",
    "elapsedSeconds": 45
  },
  "upcomingTracks": [
    {
      "id": "naat124",
      "title": "Next Naat",
      "duration": 250
    }
  ],
  "streamUrl": "https://cloud.appwrite.io/v1/storage/buckets/live-stream/files/master.m3u8/view?project={projectId}"
}
```

## Setup

### 1. Environment Variables

Required in Appwrite Function settings:
- `APPWRITE_FUNCTION_API_ENDPOINT` (auto-set)
- `APPWRITE_FUNCTION_PROJECT_ID` (auto-set)
- `APPWRITE_API_KEY` (set manually)
- `APPWRITE_DATABASE_ID` (set manually)

### 2. Function Configuration

- Runtime: Node.js 18+
- Timeout: 15 seconds
- Memory: 256MB
- Execute access: Public (for frontend to call)

### 3. Build & Deploy

```bash
cd functions/live-stream-metadata
npm install
npm run build
```

Deploy via Appwrite CLI or Console.

## Usage in Frontend

```typescript
// Poll every 10 seconds
const fetchMetadata = async () => {
  const response = await fetch(
    'https://cloud.appwrite.io/v1/functions/{functionId}/executions',
    {
      method: 'POST',
      headers: {
        'X-Appwrite-Project': projectId
      }
    }
  );
  
  const execution = await response.json();
  // Wait for execution to complete
  // Then fetch result
};
```

## Caching

Consider caching responses for 5-10 seconds to reduce load.
