# Live Stream Health Check

Monitors stream health and auto-restarts if needed.

## What It Checks

- ✅ Playlist (master.m3u8) exists
- ✅ Playlist is recent (< 60s old)
- ✅ Segments exist (at least 3)
- ✅ Latest segment is recent (< 60s old)

## Auto-Restart Conditions

Automatically restarts stream if:
- Playlist doesn't exist
- No segments found
- Latest segment is > 60s old

## Setup

### 1. Environment Variables

```
APPWRITE_FUNCTION_API_ENDPOINT (auto-set)
APPWRITE_FUNCTION_PROJECT_ID (auto-set)
APPWRITE_API_KEY (set manually)
```

### 2. Update Function ID

Edit `src/main.ts` and set:
```typescript
const STREAM_GENERATOR_FUNCTION_ID = 'your-actual-function-id';
```

### 3. Function Configuration

- Runtime: Node.js 18+
- Timeout: 30 seconds
- Memory: 256MB
- Execute access: Server-side only

### 4. Schedule Execution

Set up scheduled execution in Appwrite Console:
- Interval: Every 5 minutes
- Or use cron: `*/5 * * * *`

## Build & Deploy

```bash
cd functions/live-stream-health
npm install
npm run build
```

Deploy via Appwrite Console or CLI.

## Response

```json
{
  "success": true,
  "health": {
    "isHealthy": true,
    "issues": [],
    "segmentCount": 6,
    "lastSegmentAge": 8000,
    "playlistExists": true
  },
  "action": "none",
  "message": "Stream is healthy"
}
```

## Monitoring

Check function logs to see:
- Health check results
- Auto-restart triggers
- Any errors

## Manual Trigger

Test health check manually:

```bash
curl -X POST \
  https://cloud.appwrite.io/v1/functions/live-stream-health/executions \
  -H "X-Appwrite-Project: YOUR_PROJECT_ID" \
  -H "X-Appwrite-Key: YOUR_API_KEY"
```

## Alerts

Consider setting up alerts based on health check results:
- Email on repeated failures
- Slack notification on restart
- Dashboard for monitoring
