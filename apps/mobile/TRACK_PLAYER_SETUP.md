# React Native Track Player Setup

## Installation Complete ✓

The following has been set up for you:

1. ✓ Installed `react-native-track-player` package
2. ✓ Added plugin configuration to `app.json`
3. ✓ Created `services/trackPlayerService.ts` with basic setup
4. ✓ Created `hooks/useTrackPlayer.ts` for easy integration
5. ✓ Registered playback service in `index.js`

## Next Steps

### 1. Rebuild Your App

Since react-native-track-player requires native code, you need to rebuild your app:

```bash
# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

**Note:** This will NOT work with Expo Go. You need a development build.

### 2. Build with EAS (Recommended)

```bash
# Install EAS CLI if you haven't
npm install -g eas-cli

# Build development client
eas build --profile development --platform android
# or
eas build --profile development --platform ios
```

### 3. Using TrackPlayer in Your App

#### Basic Usage Example:

```typescript
import { useEffect } from 'react';
import TrackPlayer, { Track } from 'react-native-track-player';
import { useTrackPlayer } from '@/hooks/useTrackPlayer';

function MyAudioScreen() {
  const { isPlayerReady, isPlaying } = useTrackPlayer();

  useEffect(() => {
    if (isPlayerReady) {
      loadTrack();
    }
  }, [isPlayerReady]);

  const loadTrack = async () => {
    const track: Track = {
      id: '1',
      url: 'https://example.com/audio.mp3',
      title: 'Track Title',
      artist: 'Artist Name',
      artwork: 'https://example.com/artwork.jpg',
    };

    await TrackPlayer.add([track]);
    await TrackPlayer.play();
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  return (
    // Your UI here
  );
}
```

### 4. Migrating from expo-av to TrackPlayer

Your current `AudioContext.tsx` uses expo-av. To migrate:

#### Key Differences:

| expo-av                     | react-native-track-player |
| --------------------------- | ------------------------- |
| `Audio.Sound.createAsync()` | `TrackPlayer.add()`       |
| `sound.playAsync()`         | `TrackPlayer.play()`      |
| `sound.pauseAsync()`        | `TrackPlayer.pause()`     |
| `sound.setPositionAsync()`  | `TrackPlayer.seekTo()`    |
| `sound.setVolumeAsync()`    | `TrackPlayer.setVolume()` |

#### Benefits of TrackPlayer:

- ✓ Better background playback support
- ✓ Native media controls (lock screen, notification)
- ✓ Better performance
- ✓ More reliable on Android
- ✓ Built-in queue management
- ✓ Better battery efficiency

### 5. Example: Update AudioContext

You can create a new `AudioContextTrackPlayer.tsx` that uses TrackPlayer instead of expo-av:

```typescript
import TrackPlayer, {
  Track,
  State,
  usePlaybackState,
  useProgress,
} from "react-native-track-player";

// Replace expo-av calls with TrackPlayer equivalents
const loadAndPlay = async (audio: AudioMetadata) => {
  const track: Track = {
    id: audio.audioId || Date.now().toString(),
    url: audio.audioUrl,
    title: audio.title,
    artist: audio.channelName,
    artwork: audio.thumbnailUrl,
  };

  await TrackPlayer.reset(); // Clear queue
  await TrackPlayer.add([track]);
  await TrackPlayer.play();
};
```

### 6. Testing

After rebuilding, test these features:

- [ ] Audio plays correctly
- [ ] Lock screen controls work
- [ ] Notification controls work
- [ ] Background playback works
- [ ] Seeking works
- [ ] Volume control works

## Troubleshooting

### "Module not found" error

- Make sure you've rebuilt the app with `npx expo run:android` or `npx expo run:ios`
- TrackPlayer won't work in Expo Go

### Background audio not working

- Check that permissions are set in `app.json` (already configured)
- Verify `UIBackgroundModes` includes "audio" for iOS (already configured)

### Android notification not showing

- Check that `FOREGROUND_SERVICE` permission is set (already configured)
- Verify notification icon path in plugin config

## Resources

- [TrackPlayer Documentation](https://react-native-track-player.js.org/)
- [API Reference](https://react-native-track-player.js.org/docs/api/functions/lifecycle)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)

## Current Status

- ✓ Package installed
- ✓ Configuration complete
- ⏳ Needs rebuild (run `npx expo run:android` or `npx expo run:ios`)
- ⏳ Migration from expo-av (optional, can keep both)
