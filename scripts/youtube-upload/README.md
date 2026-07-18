# YouTube Uploader — Naat Collection

Uploads all cutAudio files to a YouTube channel. Each naat becomes a video with its original thumbnail as a static frame.

## Prerequisites

- Node.js 18+
- ffmpeg installed ([download](https://ffmpeg.org/download.html))
- Google Cloud Project with YouTube Data API v3 enabled
- Appwrite project credentials (to download audio files)

## Setup

### 1. Google Cloud — Enable YouTube Data API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. **Enable APIs** → Search for "YouTube Data API v3" → Enable
4. **Credentials** → Create Credentials → OAuth 2.0 Client ID
   - Application type: **Desktop app**
   - Download the JSON
5. From the downloaded JSON, extract:
   - `client_id` → `GOOGLE_CLIENT_ID`
   - `client_secret` → `GOOGLE_CLIENT_SECRET`

### 2. Generate a Refresh Token

Run the following to get your refresh token:

```bash
node scripts/youtube-upload/get-refresh-token.js
```

This will:
- Open a browser for you to authorize
- Output a `GOOGLE_REFRESH_TOKEN` value

### 3. Environment Variables

Add to your `.env` file:

```env
# Appwrite (to download audio files)
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key

# YouTube / Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Your Google Play Store link
PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.naatcollection.app

# Optional overrides
TITLE_PREFIX=[No Explanation]
MAX_UPLOADS_PER_DAY=10
UPLOAD_DELAY_MS=5000
```

## Usage

```bash
node scripts/youtube-upload/upload-to-youtube.js
```

### What it does per naat

1. **Downloads** cutAudio file from Appwrite Storage
2. **Downloads** thumbnail (from YouTube thumbnail URL in metadata)
3. **Creates video** via ffmpeg (thumbnail + audio → MP4)
4. **Uploads** to YouTube with:
   - Title: `[No Explanation] {original title}`
   - Description: play store link, naat info, hashtags
   - Category: People & Blogs
   - Privacy: Public
5. **Adds comment** with Play Store link
6. **Cleans up** temp files
7. **Saves progress** to `progress.json`

### Resume support

The script tracks uploaded naats in `progress.json`. If interrupted, just re-run — it skips already-uploaded ones.

### Rate limits

- Default YouTube quota: ~10,000 units/day
- Each upload costs ~1,600 units → **~6 videos/day**
- Set `MAX_UPLOADS_PER_DAY` to stay under quota
- [Request quota increase](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas) for faster uploads

### Daily counter

The script resets the daily counter automatically. Run it once per day — it will process up to `MAX_UPLOADS_PER_DAY` videos and stop.

## Important Notes

- **Pinned comment**: The comment is added but NOT automatically pinned. Pin it manually in YouTube Studio after each upload batch.
- **Audio format**: cutAudio files are `.m4a` (AAC). ffmpeg re-encodes to AAC at 192kbps for YouTube compatibility.
- **Thumbnails**: Uses the original YouTube thumbnail URL from the naat metadata.
