# Live Radio Separation - Implementation Summary

## Problem

Live radio was using the same AudioContext as regular playback, causing:

1. Wrong track advancement (playing last track instead of next)
2. Live player UI disappearing (switching to regular player)
3. Live mode mixing with regular player controls
4. No automatic track advancement when tracks end

## Solution

**Completely separated live radio from regular audio player** with dedicated:

- Context (`LiveRadioContext`)
- Mini player (`LiveRadioMiniPlayer`)
- Playback logic

## New Architecture

### 1. LiveRadioContext (`apps/mobile/contexts/LiveRadioContext.tsx`)

**Responsibilities:**

- Manages live radio playback independently
- Handles automatic track advancement
- Polls server for track changes every 30 seconds
- Detects when track finishes and checks if server has advanced
- Maintains live radio state (current track, upcoming tracks, listener count)

**Key Features:**

- When track finishes → checks server for next track
- If server hasn't advanced yet → waits 5 seconds and checks again
- Polls every 30 seconds for track changes
- Completely independent from regular AudioContext

### 2. LiveRadioMiniPlayer (`apps/mobile/components/LiveRadioMiniPlayer.tsx`)

**Features:**

- Shows only when live radio is playing
- Red "LIVE" indicator
- Pause and Stop buttons (no seek controls)
- Separate from regular MiniPlayer

### 3. Updated Live Screen (`apps/mobile/app/live.tsx`)

**Changes:**

- Now uses `useLiveRadioPlayer()` instead of `useAudioPlayer()`
- Simpler play/pause logic
- No mixing with regular audio player

### 4. Updated Root Layout (`apps/mobile/app/_layout.tsx`)

**Changes:**

- Added `LiveRadioProvider` wrapper
- Shows `LiveRadioMiniPlayer` when live radio is playing
- Shows regular `MiniPlayer` when regular audio is playing
- Never shows both at the same time

## How It Works Now

### Track Advancement Flow

```
1. User starts live radio
   ↓
2. LiveRadioContext loads current track from server
   ↓
3. Track plays
   ↓
4. Track finishes (didJustFinish event)
   ↓
5. Check server: Has currentTrackIndex advanced?
   ↓
   YES → Load and play new track
   NO  → Wait 5 seconds, check again
   ↓
6. Poll every 30 seconds for changes
```

### Server-Side Track Advancement

```
Backend cron (every 3 minutes):
1. Check if current track duration elapsed
2. If YES → Increment currentTrackIndex
3. If index wraps to 0 → Generate fresh playlist
4. Update database
   ↓
All clients poll and detect the change
   ↓
All clients load the new track
```

## Benefits

✅ Live radio completely independent from regular player
✅ Automatic track advancement works correctly
✅ No UI conflicts between live and regular player
✅ Cleaner separation of concerns
✅ Easier to maintain and debug
✅ Live radio can't interfere with regular playback

## Files Created

- `apps/mobile/contexts/LiveRadioContext.tsx` - Live radio context
- `apps/mobile/components/LiveRadioMiniPlayer.tsx` - Live radio mini player

## Files Modified

- `apps/mobile/app/live.tsx` - Uses new live radio context
- `apps/mobile/app/_layout.tsx` - Includes LiveRadioProvider and LiveRadioMiniPlayer

## Next Steps (Optional)

1. Create `LiveRadioFullPlayerModal` for expanded live player view
2. Add visual feedback when waiting for server to advance track
3. Add reconnection logic if polling fails
4. Add analytics for live radio listening

## Testing

1. Start live radio from Live tab
2. Let track play to completion
3. Verify it automatically advances to next track
4. Verify live mini player shows (not regular mini player)
5. Verify you can pause/stop live radio
6. Verify regular audio player still works independently
