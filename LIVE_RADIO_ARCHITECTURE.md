# Live Radio Architecture Proposal

## Current Issues
- Complex time-based synchronization between frontend and backend
- Race conditions when multiple clients try to sync
- Unreliable seeking in audio streams
- Duplicate track advancement logic (frontend + backend)
- High database overhead from heartbeats and realtime subscriptions

## Proposed Solution: HLS Live Streaming

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Appwrite Function)               │
│                                                              │
│  1. Playlist Manager                                         │
│     - Maintains queue of naats                               │
│     - Generates M3U8 playlist                                │
│     - Updates every 3 minutes                                │
│                                                              │
│  2. FFmpeg Stream Generator                                  │
│     - Concatenates audio files                               │
│     - Outputs HLS segments (.ts files)                       │
│     - Generates master.m3u8 playlist                         │
│                                                              │
│  3. Storage/CDN                                              │
│     - Stores HLS segments                                    │
│     - Serves master.m3u8 and segments                        │
│     - Auto-cleanup old segments                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React Native)                   │
│                                                              │
│  - Plays single HLS URL                                      │
│  - No sync logic needed                                      │
│  - Automatic buffering                                       │
│  - Shows current track metadata                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Options

#### Option 1: FFmpeg HLS (Recommended for your case)

**Pros:**
- Full control over stream
- Works with existing audio files
- Can run in Docker container
- Free and open source

**Cons:**
- Requires server/container to run FFmpeg
- Need to manage HLS segments

**Backend Setup:**
```bash
# Docker container running FFmpeg
ffmpeg -re -f concat -safe 0 -i playlist.txt \
  -c:a aac -b:a 128k \
  -f hls \
  -hls_time 10 \
  -hls_list_size 6 \
  -hls_flags delete_segments \
  -hls_segment_filename 'segment_%03d.ts' \
  output.m3u8
```

**Frontend:**
```typescript
// Just play the HLS URL
<Video
  source={{ uri: 'https://your-cdn.com/live/master.m3u8' }}
  isLooping={false}
/>
```

#### Option 2: Icecast Server

**Pros:**
- Purpose-built for live radio
- Handles multiple listeners efficiently
- Built-in metadata support

**Cons:**
- Need to run Icecast server
- Less flexible than FFmpeg

#### Option 3: Cloud Services (AWS IVS, MediaLive, etc.)

**Pros:**
- Fully managed
- Highly scalable
- Built-in CDN

**Cons:**
- Costs money (but might be worth it)
- Less control

### Recommended Implementation Plan

#### Phase 1: Simplified Approach (Quick Win)
Keep your current backend function but simplify frontend:

1. **Backend**: Function advances tracks every N minutes (as now)
2. **Frontend**: 
   - Remove all sync logic
   - Just play current track from beginning
   - Poll for track changes every 30 seconds
   - When track changes, switch to new track
   - Accept that users might be slightly out of sync (30s max)

**Benefits:**
- Much simpler code
- No seeking issues
- Works with existing infrastructure
- Can implement in 1-2 hours

#### Phase 2: True HLS Streaming (Proper Solution)

1. **Setup FFmpeg Container**
   - Deploy Docker container with FFmpeg
   - Container runs 24/7 generating HLS stream
   - Reads playlist from your database

2. **Playlist Generator Function**
   - Runs every 3 minutes (as now)
   - Updates playlist.txt file for FFmpeg
   - FFmpeg automatically picks up changes

3. **Frontend Update**
   - Replace all LiveRadioContext logic with simple HLS player
   - Use expo-av or react-native-video with HLS support
   - Show metadata from API (current track info)

4. **Metadata API**
   - Simple endpoint: GET /live/current
   - Returns: { trackId, title, artist, startedAt }
   - Frontend polls every 10s to update UI

### Code Changes for Phase 1 (Quick Win)

#### Simplified LiveRadioContext:
```typescript
// Remove: calculateElapsedTime, checkAndAdvanceTrack, realtime subscriptions
// Keep: play, pause, getCurrentState

const play = async () => {
  const state = await liveRadioService.getCurrentState();
  const naat = await liveRadioService.getCurrentNaat(state.currentTrackId);
  
  // Just play from beginning - no seeking!
  await TrackPlayer.reset();
  await TrackPlayer.add({
    url: audioUrl,
    title: naat.title,
  });
  await TrackPlayer.play();
  
  // Poll for track changes
  startPolling();
};

const startPolling = () => {
  const interval = setInterval(async () => {
    const newState = await liveRadioService.getCurrentState();
    if (newState.currentTrackIndex !== currentTrackIndex) {
      // Track changed, load new track
      await loadNewTrack(newState);
    }
  }, 30000); // Check every 30 seconds
};
```

### Code Changes for Phase 2 (HLS Streaming)

#### New Backend Service:
```javascript
// functions/hls-stream-manager/
// Runs FFmpeg process
// Generates HLS segments
// Uploads to storage
```

#### Simplified Frontend:
```typescript
// contexts/LiveRadioContext.tsx
const LiveRadioContext = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  
  // Just play HLS URL
  const play = async () => {
    await TrackPlayer.add({
      url: 'https://cdn.example.com/live/master.m3u8',
      title: 'Live Radio',
    });
    await TrackPlayer.play();
    
    // Poll for metadata only (not for sync)
    startMetadataPolling();
  };
  
  const startMetadataPolling = () => {
    setInterval(async () => {
      const metadata = await fetch('/api/live/current');
      setCurrentTrack(metadata);
    }, 10000);
  };
};
```

## Comparison

| Aspect | Current | Phase 1 | Phase 2 (HLS) |
|--------|---------|---------|---------------|
| Complexity | Very High | Low | Medium |
| Sync Accuracy | Poor (±5-30s) | Acceptable (±30s) | Perfect (±1s) |
| Code Lines | ~800 | ~200 | ~300 |
| Infrastructure | Appwrite only | Appwrite only | Appwrite + FFmpeg |
| Scalability | Limited | Limited | Excellent |
| Cost | Low | Low | Medium |
| Implementation Time | - | 2 hours | 1-2 days |

## Recommendation

1. **Immediate**: Implement Phase 1 to fix current bugs and simplify code
2. **Next Sprint**: Evaluate Phase 2 based on user feedback and scale needs
3. **Consider**: If you grow to 1000+ concurrent listeners, Phase 2 becomes essential

## Questions to Consider

1. How many concurrent listeners do you expect?
2. Is perfect sync critical, or is ±30s acceptable?
3. Do you have budget for cloud streaming services?
4. Can you run a Docker container for FFmpeg?
5. How important is it that all users hear exactly the same thing at the same time?

## Next Steps

Let me know which approach you'd like to pursue, and I can help implement it!
