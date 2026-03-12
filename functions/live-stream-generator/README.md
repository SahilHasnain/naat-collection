# Live Stream Generator

HLS live streaming function for 24/7 radio.

## How It Works

1. Reads playlist from `live_radio` collection
2. Downloads audio files from Appwrite Storage
3. Generates 10-second HLS segments using FFmpeg
4. Uploads segments to `live-stream` bucket
5. Maintains rolling playlist of last 6 segments (60 seconds)
6. Self-triggers every 14 minutes to maintain continuous stream

## Setup

### 1. Create Storage Bucket

Create a bucket named `live-stream` in Appwrite Console:
- Bucket ID: `live-stream`
- Permissions: Public read access
- File size limit: 10MB
- Allowed file extensions: `.ts`, `.m3u8`

### 2. Environment Variables

Required in Appwrite Function settings:
- `APPWRITE_FUNCTION_API_ENDPOINT` (auto-set)
- `APPWRITE_FUNCTION_PROJECT_ID` (auto-set)
- `APPWRITE_FUNCTION_ID` (auto-set)
- `APPWRITE_API_KEY` (set manually)
- `APPWRITE_DATABASE_ID` (set manually)

### 3. Function Configuration

- Runtime: Node.js 18+
- Timeout: 900 seconds (15 minutes)
- Memory: 512MB (for FFmpeg)
- Execute access: Server-side only

### 4. Build & Deploy

```bash
cd functions/live-stream-generator
npm install
npm run build
```

Deploy via Appwrite CLI or Console.

### 5. Start Stream

Trigger the function manually or via API:

```bash
curl -X POST https://cloud.appwrite.io/v1/functions/{functionId}/executions \
  -H "X-Appwrite-Project: {projectId}" \
  -H "X-Appwrite-Key: {apiKey}"
```

The function will self-trigger to maintain the stream.

## Stream URL

Once running, the HLS stream is available at:

```
https://cloud.appwrite.io/v1/storage/buckets/live-stream/files/master.m3u8/view?project={projectId}
```

## Monitoring

Check function logs in Appwrite Console to monitor:
- Segment generation
- Upload status
- Keep-alive triggers
- Errors

## Stopping the Stream

The stream will stop automatically if:
- Function execution fails
- Keep-alive trigger fails
- No more executions are triggered

To manually stop, disable the function in Appwrite Console.

## Troubleshooting

### Stream not starting
- Check function logs for errors
- Verify storage bucket exists and has correct permissions
- Ensure audio files are accessible

### Segments not uploading
- Check storage bucket permissions
- Verify API key has storage write access
- Check function memory limits

### Stream stuttering
- Increase function memory
- Check network bandwidth
- Verify audio file quality

### Keep-alive not working
- Check function has permission to trigger itself
- Verify function ID is correct in environment
- Check execution logs for trigger errors
