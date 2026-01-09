# Audio Player Testing Guide

## Manual Testing Checklist

### 1. Basic Audio Playback

#### From Home Screen (Video to Audio)

- [ ] Open app, navigate to Home tab
- [ ] Tap any video card to open VideoModal
- [ ] Tap "Play as Audio Only" button
- [ ] **Expected**: Modal closes, MiniPlayer slides up from bottom
- [ ] **Expected**: Audio starts playing automatically
- [ ] **Expected**: MiniPlayer shows thumbnail, title, and channel name

#### From Downloads Screen

- [ ] Navigate to Downloads tab
- [ ] Tap any downloaded audio card
- [ ] **Expected**: MiniPlayer appears immediately
- [ ] **Expected**: Audio starts playing from local file
- [ ] **Expected**: No loading delay (local file)

### 2. MiniPlayer Controls

#### Play/Pause

- [ ] While audio is playing, tap play/pause button in MiniPlayer
- [ ] **Expected**: Audio pauses, button changes to play icon
- [ ] Tap play button again
- [ ] **Expected**: Audio resumes, button changes to pause icon

#### Expand to Full Player

- [ ] Tap anywhere on MiniPlayer (except buttons)
- [ ] **Expected**: FullPlayerModal opens with slide animation
- [ ] **Expected**: Audio continues playing
- [ ] **Expected**: Shows album art, title, seek bar, volume control

#### Close Player

- [ ] Tap close (X) button in MiniPlayer
- [ ] **Expected**: MiniPlayer slides down and disappears
- [ ] **Expected**: Audio stops completely

### 3. Full Player Controls

#### Seek

- [ ] Open FullPlayerModal
- [ ] Drag seek slider to different position
- [ ] **Expected**: Audio jumps to new position
- [ ] **Expected**: Time labels update correctly

#### Volume

- [ ] Drag volume slider
- [ ] **Expected**: Audio volume changes in real-time
- [ ] Set volume to 0
- [ ] **Expected**: Audio is muted
- [ ] Set volume back to 1
- [ ] **Expected**: Audio is audible again

#### Close Modal

- [ ] Tap chevron-down button at top
- [ ] **Expected**: Modal closes with slide animation
- [ ] **Expected**: Returns to MiniPlayer
- [ ] **Expected**: Audio continues playing

### 4. Background Playback

#### Tab Switching

- [ ] Start playing audio on Home tab
- [ ] Switch to Downloads tab
- [ ] **Expected**: Audio continues playing
- [ ] **Expected**: MiniPlayer visible on Downloads tab
- [ ] Switch back to Home tab
- [ ] **Expected**: Audio still playing
- [ ] **Expected**: MiniPlayer still visible

#### App Minimization (iOS/Android)

- [ ] Start playing audio
- [ ] Press home button to minimize app
- [ ] **Expected**: Audio continues playing in background
- [ ] Wait 10 seconds
- [ ] **Expected**: Audio still playing
- [ ] Reopen app
- [ ] **Expected**: MiniPlayer still visible, audio still playing

#### Screen Lock (iOS/Android)

- [ ] Start playing audio
- [ ] Lock device screen
- [ ] **Expected**: Audio continues playing
- [ ] Wait 30 seconds
- [ ] **Expected**: Audio still playing
- [ ] Unlock device
- [ ] **Expected**: MiniPlayer still visible, audio still playing

### 5. Audio Switching

#### Switch Between Different Audio

- [ ] Start playing audio A
- [ ] Navigate to another audio B
- [ ] Tap "Play as Audio Only" or tap downloaded audio B
- [ ] **Expected**: Audio A stops
- [ ] **Expected**: Audio B starts playing immediately
- [ ] **Expected**: MiniPlayer updates to show audio B info

#### Switch from Downloaded to Streaming

- [ ] Play downloaded audio
- [ ] Navigate to Home, tap video, play as audio
- [ ] **Expected**: Downloaded audio stops
- [ ] **Expected**: Streaming audio starts
- [ ] **Expected**: MiniPlayer updates correctly

### 6. Error Handling

#### Network Error (Streaming)

- [ ] Turn off WiFi/mobile data
- [ ] Try to play streaming audio
- [ ] **Expected**: Error alert appears
- [ ] **Expected**: Audio doesn't load
- [ ] Turn network back on
- [ ] Try again
- [ ] **Expected**: Audio loads and plays

#### Missing Audio File

- [ ] Manually delete a downloaded audio file from device
- [ ] Try to play that audio
- [ ] **Expected**: Error alert appears
- [ ] **Expected**: Graceful failure (no crash)

### 7. Edge Cases

#### Rapid Switching

- [ ] Quickly tap multiple different audio items
- [ ] **Expected**: Only the last selected audio plays
- [ ] **Expected**: No audio overlap
- [ ] **Expected**: No crashes

#### Audio Completion

- [ ] Play short audio to completion
- [ ] **Expected**: Audio stops at end
- [ ] **Expected**: MiniPlayer remains visible
- [ ] **Expected**: Play button appears (not pause)
- [ ] Tap play button
- [ ] **Expected**: Audio restarts from beginning

#### Modal Interactions

- [ ] Open VideoModal
- [ ] Start playing audio
- [ ] While audio is loading, close modal
- [ ] **Expected**: Audio continues loading
- [ ] **Expected**: MiniPlayer appears when ready

## Automated Testing (Future)

### Unit Tests Needed

- [ ] AudioContext state management
- [ ] Play/pause/seek/volume controls
- [ ] Audio switching logic
- [ ] Error handling

### Integration Tests Needed

- [ ] MiniPlayer appearance/disappearance
- [ ] FullPlayerModal open/close
- [ ] Tab navigation with active audio
- [ ] Background playback persistence

### E2E Tests Needed

- [ ] Complete user flow: Home → Play Audio → Navigate → Background
- [ ] Download → Play → Switch to streaming
- [ ] Error recovery flows

## Performance Testing

### Memory Usage

- [ ] Play audio for 30 minutes
- [ ] Check memory usage (should be stable)
- [ ] Switch between 10 different audio files
- [ ] Check for memory leaks

### Battery Usage

- [ ] Play audio for 1 hour in background
- [ ] Monitor battery drain
- [ ] Compare with other audio apps

### Audio Quality

- [ ] Test with different audio bitrates
- [ ] Test with poor network conditions
- [ ] Test with local files vs streaming

## Known Issues / Limitations

### Current Limitations

- No queue/playlist support (single audio only)
- No lock screen controls (planned)
- No state persistence across app restarts (planned)
- No playback speed control
- No sleep timer

### Platform-Specific Issues

- **iOS**: Requires `UIBackgroundModes: ["audio"]` in app.json
- **Android**: Requires `FOREGROUND_SERVICE` permission
- **Web**: Background playback not supported (browser limitation)

## Debugging Tips

### Audio Not Playing

1. Check console logs for `[AudioContext]` messages
2. Verify audio URL is valid
3. Check network connectivity
4. Verify permissions in app.json

### MiniPlayer Not Appearing

1. Check if `currentAudio` is set in AudioContext
2. Verify AudioProvider wraps the app in \_layout.tsx
3. Check z-index and positioning

### Background Playback Not Working

1. Verify `staysActiveInBackground: true` in AudioContext
2. Check iOS `UIBackgroundModes` in app.json
3. Check Android permissions in app.json
4. Test on physical device (not simulator)

### Audio Stops When Switching Tabs

1. Verify AudioProvider is at root level (not inside tabs)
2. Check that Audio.Sound instance is not being unmounted
3. Verify no conflicting audio mode settings

## Reporting Issues

When reporting audio playback issues, include:

- Device model and OS version
- Network conditions (WiFi/4G/5G/offline)
- Audio source (streaming/downloaded)
- Console logs with `[AudioContext]` prefix
- Steps to reproduce
- Expected vs actual behavior
