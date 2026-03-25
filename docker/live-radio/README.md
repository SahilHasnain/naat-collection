# Live Radio Docker Container

This Docker container provides a complete live radio streaming solution using Icecast server with Node.js API and FFmpeg stream management.

## Features

- **Icecast Server**: Professional audio streaming server
- **Node.js API**: RESTful API for metadata and control
- **FFmpeg Stream Manager**: Automatic playlist management and streaming
- **Auto-restart**: Resilient streaming with automatic recovery
- **CORS Support**: Cross-origin requests for web/mobile apps

## Quick Start

1. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your Appwrite API key
   ```

2. **Build and run:**

   ```bash
   docker-compose up --build
   ```

3. **Access the stream:**
   - **Icecast Stream**: `http://owaisrazaqadri.duckdns.org:8000/live`
   - **API Endpoint**: `http://owaisrazaqadri.duckdns.org:8080/api/current`
   - **Icecast Admin**: `http://owaisrazaqadri.duckdns.org:8000/admin/`

## API Endpoints

### GET /api/current

Returns current track information:

```json
{
  "success": true,
  "currentTrack": {
    "id": "track_id",
    "title": "Track Title",
    "duration": 300,
    "elapsedSeconds": 45,
    "startedAt": "2026-03-12T09:00:00.000Z"
  },
  "streamUrl": "http://owaisrazaqadri.duckdns.org:8000/live",
  "listenerCount": 0
}
```

### GET /health

Health check endpoint for monitoring.

## Configuration

### Icecast Configuration

- **Port**: 8000
- **Mount Point**: `/live`
- **Admin User**: `admin`
- **Admin Password**: `hackme`
- **Source Password**: `hackme`

### Environment Variables

- `APPWRITE_API_KEY`: Your Appwrite API key (required)
- `APPWRITE_ENDPOINT`: Appwrite endpoint (default: https://sgp.cloud.appwrite.io/v1)
- `APPWRITE_PROJECT_ID`: Project ID (default: 695bb97700213f4ef5dd)
- `DATABASE_ID`: Database ID (default: 695bc8e70038db72df5b)
- `CLEAR_AUDIO_CACHE_ON_START`: Set `true` to clear cached audio (`/app/audio-cache`) at container startup

## Troubleshooting

### Container won't start

1. Check if ports 8000 and 8080 are available
2. Verify environment variables are set correctly
3. Check Docker logs: `docker-compose logs -f`

### Stream not accessible

1. Ensure firewall allows ports 8000 and 8080
2. Check if domain DNS is pointing to correct IP
3. Test locally: `curl http://localhost:8000/live`

### No audio playing

1. Check if naats have `cutAudio` field in database
2. Verify Appwrite API key has proper permissions
3. Check stream manager logs for audio caching errors

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   Mobile App    │───▶│  Icecast     │◀───│  FFmpeg     │
│                 │    │  Server      │    │  Stream     │
└─────────────────┘    │  :8000/live  │    │  Manager    │
                       └──────────────┘    └─────────────┘
                              │                    │
                              ▼                    ▼
                       ┌──────────────┐    ┌─────────────┐
                       │  Node.js     │    │  Appwrite   │
                       │  API :3000   │───▶│  Database   │
                       └──────────────┘    └─────────────┘
```

## Logs

View logs in real-time:

```bash
docker-compose logs -f live-radio
```

## Maintenance

### Update playlist

The playlist updates automatically every 3 minutes from the Appwrite database.

### Restart services

```bash
docker-compose restart
```

### Clean rebuild

```bash
docker-compose down
docker-compose up --build
```

### Force clear audio cache on startup

```bash
CLEAR_AUDIO_CACHE_ON_START=true docker-compose up --build
```

Then set it back to `false` for normal warm-cache behavior.
