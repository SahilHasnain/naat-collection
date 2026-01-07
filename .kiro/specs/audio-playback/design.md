# Design Document

## Overview

The audio playback feature enables users to stream naats as audio-only content, reducing bandwidth and providing flexibility in how they consume content. The solution uses a serverless architecture with an Appwrite function that extracts direct audio stream URLs from YouTube using yt-dlp, and a React Native player component that handles both video and audio playback modes.

### Key Design Decisions

1. **On-demand extraction**: Audio URLs are extracted when requested rather than during ingestion, avoiding storage costs for 5000+ videos
2. **Direct streaming**: Audio streams directly from YouTube's CDN, eliminating the need for proxy servers or storage
3. **URL caching**: Stream URLs are cached for 5 hours to reduce extraction overhead and improve performance
4. **Unified player**: Single player component handles both video and audio modes for consistency

## Architecture

### System Components

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         │ 1. Request audio URL
         ▼
┌─────────────────────────┐
│ Appwrite Function       │
│ (Audio Extraction)      │
│  - yt-dlp wrapper       │
│  - URL caching          │
└────────┬────────────────┘
         │
         │ 2. Extract stream info
         ▼
┌─────────────────┐
│  YouTube API    │
│  (via yt-dlp)   │
└─────────────────┘
         │
         │ 3. Return audio URL
         ▼
┌─────────────────┐
│  Mobile App     │
│  plays audio    │
└─────────────────┘
```

### Data Flow

1. User toggles to audio mode in the player
2. Player component calls `getAudioUrl(youtubeId)` from appwrite service
3. Appwrite function checks cache for existing valid URL
4. If not cached or expired, function executes yt-dlp to extract audio stream URL
5. Function caches the URL with 5-hour TTL and returns it
6. Player component loads and plays the audio stream using expo-av

## Components and Interfaces

### 1. Audio Extraction Appwrite Function

**Location**: `functions/extract-audio/src/main.js`

**Purpose**: Extract direct audio stream URLs from YouTube videos using yt-dlp

**Interface**:

```typescript
// Request
POST /functions/{functionId}/executions
Body: {
  youtubeId: string  // YouTube video ID (e.g., "dQw4w9WgXcQ")
}

// Response (Success)
{
  success: true,
  audioUrl: string,      // Direct audio stream URL
  expiresAt: number,     // Unix timestamp when URL expires
  format: string,        // Audio format (e.g., "m4a", "opus")
  quality: string        // Audio quality (e.g., "128kbps")
}

// Response (Error)
{
  success: false,
  error: string,         // Error message
  code: string          // Error code (e.g., "INVALID_ID", "EXTRACTION_FAILED")
}
```

**Implementation Details**:

- Uses yt-dlp with flags: `--get-url -f bestaudio`
- Extracts best quality audio stream URL
- Implements in-memory cache using Map with TTL
- Validates YouTube ID format before extraction
- Handles yt-dlp errors and timeouts (10 second max)

**Dependencies**:

- `yt-dlp` (installed in function runtime)
- `node-appwrite` (for function context)

### 2. Enhanced Player Component

**Location**: `app/player/[id].tsx` and new `components/AudioPlayer.tsx`

**Purpose**: Unified player that supports both video and audio playback modes

**State Management**:

```typescript
interface PlayerState {
  mode: "video" | "audio";
  audioUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  position: number; // Current playback position in ms
  duration: number; // Total duration in ms
}
```

**Key Methods**:

```typescript
// Switch between video and audio modes
switchMode(newMode: 'video' | 'audio'): Promise<void>

// Load audio stream URL
loadAudioUrl(youtubeId: string): Promise<string>

// Handle URL expiration and refresh
refreshAudioUrl(): Promise<void>

// Sync playback position when switching modes
syncPosition(position: number): void
```

### 3. Appwrite Service Extension

**Location**: `services/appwrite.ts`

**New Method**:

```typescript
async getAudioUrl(youtubeId: string): Promise<AudioUrlResponse> {
  const execution = await functions.createExecution(
    AUDIO_EXTRACTION_FUNCTION_ID,
    JSON.stringify({ youtubeId }),
    false  // Not async
  );

  return JSON.parse(execution.responseBody);
}
```

### 4. Audio Player Component

**Location**: `components/AudioPlayer.tsx`

**Purpose**: Dedicated audio playback UI with controls and visualization

**Features**:

- Audio waveform or album art display
- Play/pause button
- Seek bar with time labels
- Volume control
- Loading and error states

**Props**:

```typescript
interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  onError: (error: Error) => void;
  onPositionChange: (position: number) => void;
}
```

## Data Models

### Audio URL Cache Entry

```typescript
interface CacheEntry {
  audioUrl: string;
  expiresAt: number; // Unix timestamp
  format: string;
  quality: string;
  cachedAt: number; // Unix timestamp
}

// In-memory cache structure
const audioUrlCache = new Map<string, CacheEntry>();
```

### Playback Mode Preference

```typescript
// Stored in AsyncStorage
interface PlaybackPreference {
  mode: "video" | "audio";
  lastUpdated: number;
}

// Storage key
const PLAYBACK_MODE_KEY = "@naat_playback_mode";
```

## Error Handling

### Error Types and Recovery

1. **Extraction Failure**
   - Cause: yt-dlp fails to extract URL
   - Recovery: Show error message, fallback to video mode
   - User action: Retry or continue with video

2. **URL Expiration During Playback**
   - Cause: Stream URL expires (after ~6 hours)
   - Recovery: Automatically request fresh URL and resume
   - User experience: Brief loading indicator

3. **Network Errors**
   - Cause: No internet connection
   - Recovery: Show offline message
   - User action: Retry when connection restored

4. **Invalid YouTube ID**
   - Cause: Malformed or non-existent video ID
   - Recovery: Validate before extraction, show error
   - User action: Report issue or try different naat

### Error Response Codes

```typescript
enum AudioErrorCode {
  INVALID_ID = "INVALID_ID",
  EXTRACTION_FAILED = "EXTRACTION_FAILED",
  YTDLP_NOT_FOUND = "YTDLP_NOT_FOUND",
  TIMEOUT = "TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  URL_EXPIRED = "URL_EXPIRED",
}
```

## Testing Strategy

### Unit Tests

1. **Audio Extraction Function**
   - Test valid YouTube ID extraction
   - Test invalid YouTube ID handling
   - Test cache hit/miss scenarios
   - Test URL expiration logic
   - Test error handling for yt-dlp failures

2. **Player Component**
   - Test mode switching (video ↔ audio)
   - Test position sync when switching modes
   - Test preference storage and retrieval
   - Test error state rendering

3. **Appwrite Service**
   - Test `getAudioUrl` method
   - Test error response parsing
   - Test timeout handling

### Integration Tests

1. **End-to-End Audio Playback**
   - User opens player → switches to audio mode → audio plays
   - Test with real YouTube video IDs
   - Verify audio quality and format

2. **URL Refresh Flow**
   - Simulate URL expiration
   - Verify automatic refresh and resume
   - Check user experience during refresh

3. **Mode Switching**
   - Switch from video to audio mid-playback
   - Verify position is maintained
   - Switch back to video and verify sync

### Manual Testing Checklist

- [ ] Audio plays correctly on iOS
- [ ] Audio plays correctly on Android
- [ ] Mode toggle works smoothly
- [ ] Playback controls function in audio mode
- [ ] Preference is persisted across app restarts
- [ ] Error messages are clear and helpful
- [ ] Loading states are visible but not intrusive
- [ ] Audio quality is acceptable

## Performance Considerations

### Optimization Strategies

1. **Caching**
   - Cache audio URLs for 5 hours to minimize extraction calls
   - Store cache in memory (function instance lifetime)
   - Consider Redis for persistent cache in future

2. **Lazy Loading**
   - Only extract audio URL when user switches to audio mode
   - Don't pre-fetch audio URLs for all naats

3. **Timeout Management**
   - Set 10-second timeout for yt-dlp extraction
   - Fail fast if extraction takes too long

4. **Audio Format Selection**
   - Prefer m4a or opus formats (better compression)
   - Target 128kbps quality (balance of quality and bandwidth)

### Expected Performance Metrics

- Audio URL extraction: < 2 seconds (first request)
- Audio URL retrieval: < 100ms (cached)
- Playback start: < 1 second after URL received
- Mode switch: < 500ms

## Security Considerations

1. **Input Validation**
   - Validate YouTube ID format (11 characters, alphanumeric + underscore/hyphen)
   - Sanitize inputs before passing to yt-dlp

2. **Rate Limiting**
   - Implement rate limiting on audio extraction function
   - Prevent abuse and excessive YouTube API usage

3. **URL Expiration**
   - Audio URLs expire naturally after ~6 hours
   - No sensitive data in URLs

4. **Error Messages**
   - Don't expose internal system details in error messages
   - Log detailed errors server-side only

## Future Enhancements

1. **Offline Audio**
   - Download audio for offline playback
   - Store in device storage with expiration

2. **Audio Quality Selection**
   - Let users choose audio quality (64kbps, 128kbps, 256kbps)
   - Balance quality vs bandwidth

3. **Background Playback**
   - Continue audio playback when app is backgrounded
   - Show media controls in notification tray

4. **Playlist Support**
   - Auto-play next naat in audio mode
   - Queue management

5. **Analytics**
   - Track audio vs video usage
   - Monitor extraction success rates
   - Identify popular naats for pre-caching
