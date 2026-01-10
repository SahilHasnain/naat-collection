# Repeat & Autoplay Implementation

## Features Added

### 1. Repeat Mode

- **Simple on/off toggle** for "Repeat One"
- When enabled, the current track loops automatically when it finishes
- State persisted to AsyncStorage (survives app restarts)
- Visual indicator in UI (highlighted button with accent color)

### 2. Autoplay Mode

- **Simple on/off toggle** for autoplay
- When enabled and a track finishes (and repeat is off), plays a random track from your collection
- Works on both Home screen (all naats) and Downloads screen (downloaded naats)
- State persisted to AsyncStorage (survives app restarts)
- Visual indicator in UI (highlighted button with accent color)

## Files Modified

### 1. `contexts/AudioContext.tsx`

- Added `isRepeatEnabled` and `isAutoplayEnabled` state
- Added `toggleRepeat()` and `toggleAutoplay()` functions
- Added `setAutoplayCallback()` to register autoplay handler from screens
- Modified `onPlaybackStatusUpdate` to handle repeat and autoplay logic
- Added AsyncStorage persistence for both settings
- Loads saved preferences on app start

### 2. `components/FullPlayerModal.tsx`

- Added repeat and autoplay toggle buttons below main controls
- Buttons show active state with accent color
- Integrated with AudioContext state

### 3. `app/index.tsx` (Home Screen)

- Added autoplay callback that picks random naat from available collection
- Callback registered via `setAutoplayCallback()`
- Automatically loads and plays random audio when current track finishes

### 4. `app/downloads.tsx` (Downloads Screen)

- Added autoplay callback that picks random download
- Works the same way as home screen but uses downloaded files
- Ensures autoplay works in offline mode

## How It Works

### Repeat Flow

1. User taps "Repeat" button in FullPlayerModal
2. `toggleRepeat()` is called, flipping the state
3. New state saved to AsyncStorage
4. When track finishes (`didJustFinish`), AudioContext checks `isRepeatEnabled`
5. If true, calls `sound.replayAsync()` to restart the track

### Autoplay Flow

1. User taps "Autoplay" button in FullPlayerModal
2. `toggleAutoplay()` is called, flipping the state
3. New state saved to AsyncStorage
4. Each screen registers its autoplay callback via `setAutoplayCallback()`
5. When track finishes and repeat is off, AudioContext checks `isAutoplayEnabled`
6. If true, calls the registered callback (which picks and plays random track)

## UI Design

The controls are placed in a new row below the main play/pause controls:

```
[Video Button]  [Play/Pause]  [Download Button]
                    ↓
         [Repeat Button]  [Autoplay Button]
```

Both buttons:

- Show icon + text label
- Highlight with accent color when active
- Have rounded pill shape with dark background
- Include accessibility labels

## Testing

To test the implementation:

1. **Repeat Mode**:
   - Play any track
   - Enable repeat in full player
   - Wait for track to finish
   - Track should restart automatically

2. **Autoplay Mode**:
   - Play any track
   - Enable autoplay in full player
   - Wait for track to finish
   - A random track should start playing

3. **Persistence**:
   - Enable repeat and/or autoplay
   - Close and reopen the app
   - Settings should be preserved

4. **Priority**:
   - Enable both repeat and autoplay
   - Repeat should take priority (track loops)
   - Disable repeat
   - Autoplay should now work

## Future Enhancements

- Add "Repeat All" mode when playlists are implemented
- Add queue/playlist support for sequential autoplay
- Add smart autoplay (similar artists/channels)
- Add autoplay history to avoid immediate repeats
