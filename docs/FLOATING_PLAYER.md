# Floating Player Implementation

## Overview

The FloatingPlayer replaces the mobile-style MiniPlayer + FullPlayerModal pattern with a desktop-optimized floating widget.

## Features

### Three Display Modes

1. **Minimized** (64x64px circle)
   - Shows thumbnail with play/pause icon overlay
   - Click to expand to compact mode
   - Stays out of the way

2. **Compact** (320px wide)
   - Thumbnail, title, artist
   - Progress bar at top
   - Play/pause, time display
   - Expand, minimize, and close buttons
   - Draggable by header area

3. **Expanded** (384px wide)
   - Full album art
   - Complete playback controls
   - Seek bar with time display
   - Skip forward/backward 10s buttons
   - Draggable by header

### User Experience

- **Draggable**: Click and drag the player anywhere on screen
- **Persistent Position**: Remembers position in localStorage
- **Smooth Transitions**: Animated state changes
- **Keyboard Accessible**: All controls are keyboard-friendly
- **Non-blocking**: Browse content while audio plays

## Usage

The FloatingPlayer automatically appears when audio is loaded via the AudioPlayerContext:

```tsx
const { actions } = useAudioPlayer();

await actions.loadAndPlay({
  audioUrl: "https://...",
  title: "Naat Title",
  channelName: "Artist Name",
  thumbnailUrl: "https://...",
  audioId: "123",
  youtubeId: "abc123",
});
```

## Implementation Details

### Component Structure

```
FloatingPlayer
├── Minimized View (circle icon)
├── Compact View (mini player)
└── Expanded View (full controls)
```

### State Management

- Uses AudioPlayerContext for playback state
- Local state for player size and position
- localStorage for position persistence

### Styling

- Tailwind CSS for all styling
- Custom slider styles in globals.css
- Smooth transitions and hover effects

## Future Enhancements

Potential additions:

- Queue management UI
- Lyrics display
- Volume control slider
- Playback speed control
- Keyboard shortcuts (space, arrows)
- Double-click to expand/collapse
- Snap to edges feature
- Remember size preference
