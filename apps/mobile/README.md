# Mobile App

React Native mobile app built with Expo SDK 54.

## Audio Player

Uses `@weights-ai/react-native-track-player` for background audio playback with New Architecture support.

See [Migration Guide](../../docs/MIGRATION.md) for details on the expo-av to react-native-track-player migration.

## Setup

```bash
npm install
npm run android  # or npm run ios
```

## Key Files

- `index.js` - Entry point with TrackPlayer service registration
- `contexts/AudioContext.tsx` - Global audio player state
- `contexts/LiveRadioContext.tsx` - Live radio playback
- `services/trackPlayerService.ts` - TrackPlayer configuration

## Documentation

See [docs folder](../../docs/) for detailed documentation.
