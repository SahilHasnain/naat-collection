# Video Modal to Screen Migration

## Summary

Migrated the video player from a modal overlay to a dedicated screen using Expo Router's file-based routing. This provides a cleaner, more native mobile experience.

## Changes Made

### 1. Created New Video Screen

- **File**: `apps/mobile/app/video.tsx`
- Converted `VideoModal` component logic to a standalone screen
- Uses `useLocalSearchParams()` to receive navigation params
- Added back button in header for navigation
- Maintains all original functionality (video playback, audio switching, repeat, etc.)

### 2. Updated Home Screen (`apps/mobile/app/index.tsx`)

- Removed modal state (`selectedNaat`, `modalVisible`, `isVideoFallback`)
- Removed `VideoModal` import
- Added `useRouter()` from expo-router
- Updated `handleNaatPress()` to navigate to `/video` screen with params
- Updated `loadAudioDirectly()` fallback to navigate instead of opening modal
- Removed modal JSX at bottom of component

### 3. Updated History Screen (`apps/mobile/app/history.tsx`)

- Same changes as Home Screen
- Removed modal state and imports
- Updated navigation logic to use `router.push()`
- Removed modal JSX

### 4. Updated Root Layout (`apps/mobile/app/_layout.tsx`)

- Removed `VideoModal` import
- Removed modal state (`isVideoModalVisible`, `videoData`)
- Updated `handleSwitchToVideo()` to navigate to video screen
- Removed modal JSX

### 5. Updated Component Exports (`apps/mobile/components/index.ts`)

- Removed `VideoModal` export (component file kept for potential web use)

## Navigation Pattern

### Before (Modal):

```typescript
setSelectedNaat(naat);
setModalVisible(true);
```

### After (Screen):

```typescript
router.push({
  pathname: "/video",
  params: {
    videoUrl: naat.videoUrl,
    title: naat.title,
    channelName: naat.channelName,
    thumbnailUrl: naat.thumbnailUrl,
    youtubeId: naat.youtubeId,
    audioId: naat.audioId,
    isFallback: "false",
  },
});
```

## Benefits

- Native navigation experience with back button
- Better integration with React Navigation stack
- Cleaner state management (no modal state needed)
- Consistent with mobile UX patterns
- Easier to add features like sharing, comments, etc. in the future

## Note on Autoplay

Autoplay functionality will be addressed in a future update as requested by the user.
