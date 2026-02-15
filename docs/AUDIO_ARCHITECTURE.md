# Audio Player Architecture

## Overview

The app uses a persistent audio player architecture powered by `react-native-track-player` that allows audio to play in the background across all screens, similar to Spotify or YouTube Music.

## Core Components

### 1. AudioContext (`contexts/AudioContext.tsx`)

**Purpose**: Global audio state management and playback control

**Technology**: `@weights-ai/react-native-track-player` (New Architecture compatible fork)

**Features**:

- TrackPlayer queue system for audio management
- Background playback with foreground service
- Lock screen controls and media notifications
- Manages playback state (play/pause/seek/volume)
- Persists across navigation
- Repeat and autoplay functionality

**API**:

```typescript
{
  // State
  currentAudio: AudioMetadata | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number; // milliseconds
  duration: number; // milliseconds
  volume: number;
  error: Error | null;

  // Actions
  loadAndPlay: (audio: AudioMetadata) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (positionMillis: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  stop: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
}
```

### 2. MiniPlayer (`components/MiniPlayer.tsx`)

**Purpose**: Always-visible bottom player bar

**Features**:

- Positioned 72px above tab bar
- Shows thumbnail, title, channel name
- Play/pause and close buttons
- Tap to expand to full player
- Smooth slide-up/down animation
- Persists across all screens

**Behavior**:

- Appears when audio is loaded
- Disappears when audio is stopped
- Doesn't block navigation

### 3. FullPlayerModal (`components/FullPlayerModal.tsx`)

**Purpose**: Expanded full-screen player view

**Features**:

- Full album art display
- Complete playback controls (seek, volume)
- Time display
- Close button returns to mini player
- Modal doesn't unmount audio when closed

**Behavior**:

- Opens when mini player is tapped
- Controlled by AudioContext (no local state)
- Audio continues playing when closed

### 4. Integration Points

#### VideoModal (`components/VideoModal.tsx`)

**Changes**:

- Removed local AudioPlayer component
- "Play as Audio" button now calls `loadAndPlay()` from AudioContext
- Modal closes after loading audio
- Audio continues playing via MiniPlayer

**Flow**:

1. User taps "Play as Audio Only"
2. Checks if audio is downloaded (local) or needs streaming
3. Calls `loadAndPlay()` with audio metadata
4. Closes modal
5. Audio plays via MiniPlayer

#### DownloadedAudioModal (`components/DownloadedAudioModal.tsx`)

**Changes**:

- Completely simplified - no UI rendering
- Immediately loads audio via AudioContext
- Closes modal instantly
- Audio plays via MiniPlayer

**Flow**:

1. User taps downloaded audio card
2. Modal triggers `loadAndPlay()` with local file path
3. Modal closes immediately
4. Audio plays via MiniPlayer

## Background Playback Configuration

### iOS (`app.json`)

```json
"ios": {
  "infoPlist": {
    "UIBackgroundModes": ["audio"]
  }
}
```

### Android (`app.json`)

```json
"android": {
  "permissions": [
    "FOREGROUND_SERVICE",
    "FOREGROUND_SERVICE_MEDIA_PLAYBACK"
  ]
}
```

### Audio Mode (`contexts/AudioContext.tsx`)

```typescript
await Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  staysActiveInBackground: true, // Key setting!
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
});
```

## User Experience

### Playing Audio

1. **From Home Screen**:
   - Tap video card → VideoModal opens
   - Tap "Play as Audio Only" → Modal closes, MiniPlayer appears
   - Audio plays in background

2. **From Downloads Screen**:
   - Tap downloaded audio card
   - MiniPlayer appears immediately
   - Audio plays from local storage

### Controlling Playback

1. **Mini Player**:
   - Tap play/pause button
   - Tap anywhere else to expand to full player
   - Tap close to stop audio

2. **Full Player**:
   - Seek through audio
   - Adjust volume
   - Play/pause
   - Close to return to mini player

### Navigation

- Audio continues playing when switching tabs
- Audio continues when app is minimized
- Audio continues when screen is locked
- MiniPlayer visible on all screens

## Benefits

✅ **Background Playback**: Audio plays when app is minimized or screen is locked
✅ **Persistent Player**: Single audio instance across entire app
✅ **Better UX**: No need to keep modal open to listen
✅ **Memory Efficient**: Single Audio.Sound instance
✅ **Offline Support**: Works with downloaded files
✅ **Simple Integration**: Easy to add audio playback anywhere via `useAudioPlayer()` hook

## Future Enhancements

Potential features to add:

- [ ] Lock screen controls (media notifications)
- [ ] Queue/playlist support
- [ ] Auto-play next from same channel
- [ ] State persistence (resume on app restart)
- [ ] Playback speed control
- [ ] Sleep timer
- [ ] Lyrics display
- [ ] Share currently playing

## Download Functionality

### Location

Download controls are available in the **FullPlayerModal** only (not in MiniPlayer to keep it minimal).

### How It Works

1. **Streaming Audio**: Shows download button (gray with download icon)
2. **Downloading**: Button turns blue, shows progress percentage
3. **Downloaded**: Button turns green with checkmark icon
4. **Delete**: Tap downloaded button → confirmation alert → delete

### Implementation

- Uses `audioDownloadService` from existing services
- Checks download status when audio changes
- Shows progress during download
- Persists download state across modal open/close
- Only shows for streaming audio (not already downloaded files)

### User Flow

1. User plays streaming audio
2. User taps MiniPlayer to expand
3. User sees download button next to play/pause
4. User taps download → audio downloads in background
5. User can continue listening while downloading
6. Download completes → button turns green
7. Next time user plays this audio, it loads from local storage

### Benefits

- Download while listening
- No interruption to playback
- Visual feedback (progress %)
- Easy to delete downloads
- Automatic use of local files when available
