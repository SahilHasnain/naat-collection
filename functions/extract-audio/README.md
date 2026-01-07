# Audio Extraction Function

Extracts direct audio stream URLs from YouTube videos with cookie-based authentication to bypass bot detection.

## Features

- ✅ Cookie-based authentication (bypasses YouTube bot detection)
- ✅ In-memory caching (5-hour TTL)
- ✅ Timeout protection (15 seconds)
- ✅ User-agent spoofing
- ✅ Detailed error codes

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure YouTube Cookies (Required)

YouTube blocks automated requests. You need to provide authenticated cookies:

**Quick Method:**

```bash
cd tools
node export-youtube-cookies.js /path/to/cookies.txt
```

See [COOKIE_SETUP.md](./COOKIE_SETUP.md) for detailed instructions.

### 3. Set Environment Variables

Add to Appwrite Function settings:

```
YOUTUBE_COOKIES=<base64-encoded-cookies>
CACHE_TTL_HOURS=5
```

## API

### Request

```json
POST /
{
  "youtubeId": "IZTEreYp-3g"
}
```

### Response (Success)

```json
{
  "success": true,
  "audioUrl": "https://...",
  "expiresAt": 1704672000000,
  "format": "m4a",
  "quality": "128kbps",
  "cached": false
}
```

### Response (Error)

```json
{
  "success": false,
  "error": "YouTube bot detection triggered...",
  "code": "BOT_DETECTED"
}
```

## Error Codes

| Code                | Description               | HTTP Status |
| ------------------- | ------------------------- | ----------- |
| `INVALID_REQUEST`   | Malformed JSON            | 400         |
| `INVALID_ID`        | Invalid YouTube ID format | 400         |
| `BOT_DETECTED`      | YouTube requires cookies  | 403         |
| `TIMEOUT`           | Extraction took too long  | 504         |
| `NETWORK_ERROR`     | Video unavailable/private | 502         |
| `YTDLP_NOT_FOUND`   | youtube-dl-exec missing   | 503         |
| `EXTRACTION_FAILED` | Generic extraction error  | 500         |
| `INTERNAL_ERROR`    | Unexpected server error   | 500         |

## Testing

```bash
# Local test
npm test

# Test with curl
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"youtubeId":"IZTEreYp-3g"}'
```

## Troubleshooting

### "Sign in to confirm you're not a bot"

- You need to configure `YOUTUBE_COOKIES` environment variable
- See [COOKIE_SETUP.md](./COOKIE_SETUP.md)

### Extraction timeouts

- Check your network connection
- Verify yt-dlp is installed in the function environment
- Try increasing `EXTRACTION_TIMEOUT_MS` in code

### Cookies expired

- Re-export cookies from your browser
- Update the `YOUTUBE_COOKIES` environment variable
- Cookies typically last 1-2 weeks

## Performance

- **Cache hit**: ~5ms response time
- **Cache miss**: ~3-8 seconds (YouTube extraction)
- **Timeout**: 15 seconds max

## Security

- Cookies are stored temporarily in memory only
- Cookie file is created in `/tmp` and cleaned up
- Never commit cookie files to git
- Rotate cookies regularly
