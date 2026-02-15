# Migration from expo-av to react-native-track-player

## Summary

Successfully migrated from `expo-av` to `@weights-ai/react-native-track-player` for Expo SDK 54 compatibility.

## Changes Made

### 1. Package Changes

- Removed: `expo-av`
- Added: `@weights-ai/react-native-track-player@^4.1.2`
- Added: `patch-package@^8.0.0` (devDependency)

### 2. New Files Created

- `apps/mobile/index.js` - Entry point with TrackPlayer registration
- `apps/mobile/services/trackPlayerService.ts` - TrackPlayer setup and playback service
- `apps/mobile/patches/@weights-ai+react-native-track-player+4.1.2.patch` - Null safety patch

### 3. Modified Files

#### `apps/mobile/contexts/AudioContext.tsx`

- Replaced `Audio.Sound` with TrackPlayer queue system
- Replaced `Audio.setAudioModeAsync` with `TrackPlayer.setupPlayer`
- Changed from callback-based to event-based playback handling
- Used `useTrackPlayerEvents` and `useProgress` hooks
- Position/duration now in seconds (converted to milliseconds for compatibility)

#### `apps/mobile/contexts/LiveRadioContext.tsx`

- Same changes as AudioContext
- Removed manual app state handling (TrackPlayer handles this)
- Simplified track advancement logic

#### `apps/mobile/package.json`

- Added postinstall script for patch-package
- Updated dependencies

### 4. Key API Mappings

| expo-av                     | react-native-track-player                     |
| --------------------------- | --------------------------------------------- |
| `Audio.Sound.createAsync()` | `TrackPlayer.add()` + `TrackPlayer.play()`    |
| `sound.playAsync()`         | `TrackPlayer.play()`                          |
| `sound.pauseAsync()`        | `TrackPlayer.pause()`                         |
| `sound.stopAsync()`         | `TrackPlayer.reset()`                         |
| `sound.setPositionAsync()`  | `TrackPlayer.seekTo()`                        |
| `sound.setVolumeAsync()`    | `TrackPlayer.setVolume()`                     |
| `onPlaybackStatusUpdate`    | `useTrackPlayerEvents([Event.PlaybackState])` |
| Position in milliseconds    | Position in seconds (multiply by 1000)        |

## Next Steps

1. Run `npm install` in `apps/mobile/`
2. Run `cd android && ./gradlew clean` to clean Android build
3. Rebuild the app: `npm run android` or `npm run ios`
4. Test all playback features:
   - Play/pause/stop
   - Seek
   - Volume control
   - Repeat mode
   - Autoplay
   - Background playback
   - Live radio

## Troubleshooting

If you encounter null safety errors:

1. The patch file should handle this automatically
2. If issues persist, regenerate the patch with `npx patch-package @weights-ai/react-native-track-player`

If TrackPlayer doesn't initialize:

1. Check that `index.js` is being loaded before the app
2. Verify `newArchEnabled=true` in `android/gradle.properties`
3. Clean and rebuild: `cd android && ./gradlew clean && cd .. && npm run android`
