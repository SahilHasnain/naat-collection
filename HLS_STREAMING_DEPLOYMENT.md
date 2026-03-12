# HLS Live Streaming - Deployment Guide

Complete guide to deploy the HLS live streaming system for your 24/7 radio.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  live-stream-generator (Appwrite Function)                  │
│  - Generates HLS segments every 10 seconds                  │
│  - Uploads to Appwrite Storage                              │
│  - Self-triggers to run continuously                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Appwrite Storage (live-stream bucket)                      │
│  - master.m3u8 (playlist)                                   │
│  - segment_001.ts, segment_002.ts, ... (10s chunks)         │
│  - Auto-cleanup old segments                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Mobile App (React Native)                                  │
│  - Plays HLS stream URL                                     │
│  - Polls metadata API for current track info               │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Appwrite Pro account (for longer function timeouts)
- Existing `live_radio` collection with playlist
- Audio files in Appwrite Storage
- Appwrite CLI installed (optional)

## Step 1: Create Storage Bucket

1. Go to Appwrite Console → Storage
2. Create new bucket:
   - **Bucket ID**: `live-stream`
   - **Name**: Live Stream
   - **Permissions**: 
     - Read: `any`
     - Write: `server` (function will write)
   - **File size limit**: 10MB
   - **Allowed extensions**: `.ts`, `.m3u8`
   - **Compression**: Disabled
   - **Encryption**: Enabled
   - **Antivirus**: Enabled

## Step 2: Build Functions

```bash
# Build streaming generator
cd functions/live-stream-generator
npm install
npm run build

# Build metadata API
cd ../live-stream-metadata
npm install
npm run build
```

## Step 3: Deploy Functions

### Option A: Using Appwrite Console

1. **Deploy live-stream-generator:**
   - Go to Functions → Create Function
   - Name: `Live Stream Generator`
   - Runtime: `Node.js 18`
   - Entrypoint: `dist/main.js`
   - Upload `dist/` folder and `node_modules/`
   - Set timeout: `900` seconds (15 minutes)
   - Set memory: `512` MB
   - Execute access: Server-side only
   - Environment variables:
     ```
     APPWRITE_API_KEY=your_api_key
     APPWRITE_DATABASE_ID=your_database_id
     ```

2. **Deploy live-stream-metadata:**
   - Go to Functions → Create Function
   - Name: `Live Stream Metadata`
   - Runtime: `Node.js 18`
   - Entrypoint: `dist/main.js`
   - Upload `dist/` folder and `node_modules/`
   - Set timeout: `15` seconds
   - Set memory: `256` MB
   - Execute access: Public (any)
   - Environment variables:
     ```
     APPWRITE_API_KEY=your_api_key
     APPWRITE_DATABASE_ID=your_database_id
     ```

### Option B: Using Appwrite CLI

```bash
# Login
appwrite login

# Deploy streaming generator
appwrite deploy function \
  --functionId live-stream-generator \
  --name "Live Stream Generator" \
  --runtime node-18.0 \
  --entrypoint dist/main.js \
  --timeout 900 \
  --memory 512

# Deploy metadata API
appwrite deploy function \
  --functionId live-stream-metadata \
  --name "Live Stream Metadata" \
  --runtime node-18.0 \
  --entrypoint dist/main.js \
  --timeout 15 \
  --memory 256
```

## Step 4: Configure Permissions

Ensure the API key used has these permissions:
- ✅ Database read/write access
- ✅ Storage read/write access
- ✅ Functions execute access

## Step 5: Start the Stream

Trigger the streaming function manually:

```bash
curl -X POST \
  https://cloud.appwrite.io/v1/functions/live-stream-generator/executions \
  -H "X-Appwrite-Project: YOUR_PROJECT_ID" \
  -H "X-Appwrite-Key: YOUR_API_KEY"
```

Or via Appwrite Console:
1. Go to Functions → Live Stream Generator
2. Click "Execute"
3. Leave body empty
4. Click "Execute Now"

The function will:
1. Start generating HLS segments
2. Upload to storage
3. Self-trigger every 14 minutes to continue

## Step 6: Verify Stream

Check if stream is working:

1. **Check function logs:**
   - Go to Functions → Live Stream Generator → Executions
   - Look for "Generated segment" messages
   - Verify no errors

2. **Check storage:**
   - Go to Storage → live-stream bucket
   - Should see `master.m3u8` and `segment_*.ts` files

3. **Test stream URL:**
   ```
   https://cloud.appwrite.io/v1/storage/buckets/live-stream/files/master.m3u8/view?project=YOUR_PROJECT_ID
   ```
   
   Open in VLC or browser to test playback.

## Step 7: Monitor

### Health Checks

Create a monitoring script to check stream health:

```bash
#!/bin/bash
# check-stream.sh

STREAM_URL="https://cloud.appwrite.io/v1/storage/buckets/live-stream/files/master.m3u8/view?project=YOUR_PROJECT_ID"

# Check if playlist exists
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STREAM_URL")

if [ $STATUS -eq 200 ]; then
  echo "✅ Stream is live"
else
  echo "❌ Stream is down (HTTP $STATUS)"
  # Trigger restart
  curl -X POST https://cloud.appwrite.io/v1/functions/live-stream-generator/executions \
    -H "X-Appwrite-Project: YOUR_PROJECT_ID" \
    -H "X-Appwrite-Key: YOUR_API_KEY"
fi
```

Run this every 5 minutes via cron:
```bash
*/5 * * * * /path/to/check-stream.sh
```

### Logs

Monitor function logs for:
- ✅ "Generated segment" - segments being created
- ✅ "Uploaded segment" - segments uploaded successfully
- ✅ "Keep-alive triggered" - function self-triggering
- ❌ "Error" - any errors

## Troubleshooting

### Stream not starting

**Problem:** Function executes but no segments appear

**Solutions:**
1. Check function logs for errors
2. Verify storage bucket permissions
3. Ensure audio files are accessible
4. Check API key permissions

### Segments not uploading

**Problem:** Segments generated but not in storage

**Solutions:**
1. Check storage bucket exists
2. Verify API key has storage write access
3. Check function memory (increase to 512MB)
4. Look for upload errors in logs

### Keep-alive not working

**Problem:** Stream stops after 15 minutes

**Solutions:**
1. Verify function has permission to trigger itself
2. Check `APPWRITE_FUNCTION_ID` environment variable
3. Look for "Keep-alive triggered" in logs
4. Ensure function timeout is 900 seconds

### Stream stuttering/buffering

**Problem:** Playback is choppy

**Solutions:**
1. Increase function memory to 512MB or 1GB
2. Check audio file quality (lower bitrate if needed)
3. Verify network bandwidth
4. Check segment generation time in logs

### High costs

**Problem:** Appwrite usage is high

**Solutions:**
1. Reduce segment duration (but increases overhead)
2. Lower audio bitrate (128k → 96k)
3. Implement CDN caching
4. Reduce playlist size (6 → 4 segments)

## Cost Estimation

**Appwrite Pro Plan:**
- Function executions: ~100/day (keep-alive triggers)
- Storage: ~5MB (6 segments × ~800KB each)
- Bandwidth: Depends on listeners

**For 100 concurrent listeners:**
- 128kbps stream = ~1MB/minute per listener
- 100 listeners × 1MB × 60 min = 6GB/hour
- ~4,320 GB/month

**Estimated cost:** $50-100/month on Appwrite Pro

## Next Steps

1. ✅ Deploy functions
2. ✅ Start stream
3. ✅ Verify playback
4. ⏭️ Update frontend to use HLS stream
5. ⏭️ Add monitoring/alerts
6. ⏭️ Test with real users

## Support

If you encounter issues:
1. Check function logs first
2. Verify all environment variables
3. Test stream URL in VLC
4. Review this guide's troubleshooting section

## Frontend Integration

See `FRONTEND_INTEGRATION.md` for updating the React Native app to use the HLS stream.
