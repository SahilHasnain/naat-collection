# React Native Track Player with New Architecture

This document explains how we configured react-native-track-player to work with React Native's New Architecture in Expo SDK 54.

## The Problem

React Native 0.76+ and Expo SDK 54 require the New Architecture to be enabled (`newArchEnabled=true`). However, the official `react-native-track-player` package (v4.1.2) doesn't support the New Architecture, creating a conflict:

- `react-native-reanimated` v4.x requires `newArchEnabled=true`
- `react-native-track-player` v4.x requires `newArchEnabled=false`

This makes it impossible to use both libraries together with the official packages.

## The Solution

We switched to a community fork that supports the New Architecture: `@weights-ai/react-native-track-player`

### Steps Taken

#### 1. Enable New Architecture

**File:** `android/gradle.properties`

```properties
newArchEnabled=true
```

#### 2. Replace Track Player Package

**File:** `package.json`

```json
{
  "dependencies": {
    "@weights-ai/react-native-track-player": "^4.1.2",
    "react-native-reanimated": "~4.1.1"
  }
}
```

Removed the official package:

```bash
npm uninstall react-native-track-player
npm install @weights-ai/react-native-track-player
```

#### 3. Update Imports

Updated all imports from `react-native-track-player` to `@weights-ai/react-native-track-player`:

**Files changed:**

- `contexts/TrackPlayerContext.tsx`
- `services/trackPlayerService.ts`
- `index.js`

```typescript
// Before
import TrackPlayer from "react-native-track-player";

// After
import TrackPlayer from "@weights-ai/react-native-track-player";
```

#### 4. Apply Null Safety Patch

The fork still has null safety issues in the Android module. We created a patch using `patch-package`:

**File:** `patches/@weights-ai+react-native-track-player+4.1.6.patch`

The patch adds null coalescing operators to prevent crashes:

```kotlin
// Before
callback.resolve(Arguments.fromBundle(musicService.tracks[index].originalItem))

// After
callback.resolve(Arguments.fromBundle(musicService.tracks[index].originalItem ?: Bundle()))
```

This patch is automatically applied on `npm install` via the `postinstall` script.

#### 5. Fix Entry Point

**File:** `index.js`

Ensured the playback service is registered before the app loads:

```javascript
import TrackPlayer from "@weights-ai/react-native-track-player";
import { PlaybackService } from "./services/trackPlayerService";

// Register the playback service before app loads
TrackPlayer.registerPlaybackService(() => PlaybackService);

// Import expo-router entry
import "expo-router/entry";
```

#### 6. Enable Auto-Play

**File:** `contexts/TrackPlayerContext.tsx`

Added auto-play after setup completes:

```typescript
await TrackPlayer.setupPlayer({ waitForBuffer: true });
await TrackPlayer.updateOptions({
  /* ... */
});
await TrackPlayer.add({
  /* stream config */
});

// Auto-play on mount
await TrackPlayer.play();
```

## Verification

Run `npx expo-doctor` to verify all dependencies are compatible:

```bash
npx expo-doctor
# Should show: 17/17 checks passed. No issues detected!
```

## Alternative Solutions Considered

### Option 1: Downgrade Reanimated (Not Chosen)

- Downgrade to `react-native-reanimated` v3.15.0
- Keep `newArchEnabled=false`
- **Rejected:** Expo SDK 54 expects Reanimated v4.x

### Option 2: Use praisedavid787's Fork (Not Chosen)

- Full New Architecture support
- Requires complex local fork setup with metro config changes
- **Rejected:** Too complex for maintenance

### Option 3: Use @weights-ai Fork (Chosen)

- Published to npm, easy to install
- New Architecture support
- Drop-in replacement
- **Chosen:** Best balance of simplicity and functionality

## Known Issues

1. The `@weights-ai/react-native-track-player` fork is community-maintained and may not receive updates as quickly as the official package
2. The null safety patch needs to be maintained if the package version changes

## Future Considerations

When the official `react-native-track-player` adds New Architecture support (likely v5.x), we should:

1. Switch back to the official package
2. Remove the `@weights-ai` fork
3. Test if the null safety patch is still needed
4. Update all imports back to `react-native-track-player`

## References

- [GitHub Issue #2443 - New Architecture Support](https://github.com/doublesymmetry/react-native-track-player/issues/2443)
- [@weights-ai/react-native-track-player on npm](https://www.npmjs.com/package/@weights-ai/react-native-track-player)
- [React Native New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
