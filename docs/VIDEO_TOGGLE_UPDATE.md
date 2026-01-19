# Video Toggle Feature - FloatingPlayer Update

## What's New

Added "Switch to Video" functionality to the FloatingPlayer, matching the feature available in MiniPlayer.

## Changes Made

### FloatingPlayer Component

**Added:**

- `isVideoModalOpen` state to control VideoModal
- `handleSwitchToVideo()` callback to open video
- `handleSwitchToAudio()` callback to return to audio
- VideoModal import and integration

**UI Updates:**

#### Compact Mode

- Added small "Video" button below controls
- Blue button with video icon
- Only shows if `youtubeId` is available
- Compact design to fit in 320px width

```tsx
{
  state.currentAudio.youtubeId && (
    <button onClick={handleSwitchToVideo}>
      <VideoIcon /> Video
    </button>
  );
}
```

#### Expanded Mode

- Added full-width "Switch to Video" button
- Positioned below playback controls
- Prominent blue styling
- Only shows if `youtubeId` is available

```tsx
{
  state.currentAudio.youtubeId && (
    <button onClick={handleSwitchToVideo}>
      <VideoIcon /> Switch to Video
    </button>
  );
}
```

## User Experience

### Desktop Flow

1. User plays naat → FloatingPlayer appears
2. User sees "Video" button (compact) or "Switch to Video" (expanded)
3. Click button → VideoModal opens full-screen
4. Watch video with YouTube player
5. Click "Play as Audio Only" → Returns to FloatingPlayer
6. Audio continues seamlessly

### Visual Hierarchy

**Compact Mode:**

```
┌────────────────────┐
│ ▓ Title            │
│ ▓ Artist           │
│ 0:45 ▶ 3:20 ⤢ − ✕ │
│ [📹 Video]         │ ← New button
└────────────────────┘
```

**Expanded Mode:**

```
┌────────────────────┐
│ Now Playing     ▼ ✕│
│                    │
│   ┌──────────┐    │
│   │  Album   │    │
│   │   Art    │    │
│   └──────────┘    │
│                    │
│  Title             │
│  Artist            │
│  ━━━━━━━━━━━━━━━  │
│  0:45        3:20  │
│   ⏪  ▶  ⏩       │
│                    │
│ [📹 Switch to Video] │ ← New button
└────────────────────┘
```

## Technical Details

### State Management

```tsx
const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
```

### Video URL Construction

```tsx
const videoUrl = state.currentAudio.youtubeId
  ? `https://www.youtube.com/watch?v=${state.currentAudio.youtubeId}`
  : "";
```

### Conditional Rendering

Button only appears when:

- `state.currentAudio.youtubeId` exists
- Not null or empty string

### VideoModal Integration

```tsx
<VideoModal
  isOpen={isVideoModalOpen}
  onClose={() => setIsVideoModalOpen(false)}
  videoUrl={videoUrl}
  title={state.currentAudio.title}
  channelName={state.currentAudio.channelName}
  onSwitchToAudio={handleSwitchToAudio}
/>
```

## Styling

### Compact Mode Button

- Width: `w-full` (100%)
- Padding: `py-2 px-3` (8px vertical, 12px horizontal)
- Text: `text-xs` (12px)
- Background: `bg-blue-600` with `hover:bg-blue-700`
- Border radius: `rounded-lg` (8px)

### Expanded Mode Button

- Width: `w-full` (100%)
- Padding: `py-3 px-4` (12px vertical, 16px horizontal)
- Text: `font-medium` (normal size)
- Background: `bg-blue-600` with `hover:bg-blue-700`
- Border radius: `rounded-xl` (12px)

### Color Choice

- Blue (`bg-blue-600`) distinguishes video action from audio controls
- Matches the blue theme used elsewhere in the app
- Different from green accent used for audio progress

## Accessibility

### ARIA Labels

```tsx
aria-label="Switch to video mode"
```

### Keyboard Navigation

- Button is focusable with Tab
- Activates with Enter or Space
- VideoModal can be closed with Escape

### Screen Reader

- Button announces as "Switch to video mode"
- Icon is decorative (aria-hidden implied)

## Edge Cases Handled

1. **No YouTube ID**: Button doesn't render
2. **Video modal open**: FloatingPlayer remains in background
3. **Switch back to audio**: VideoModal closes, FloatingPlayer visible
4. **Audio continues**: Playback state maintained during switch

## Testing Checklist

- [ ] Button appears in compact mode when youtubeId exists
- [ ] Button appears in expanded mode when youtubeId exists
- [ ] Button doesn't appear when youtubeId is missing
- [ ] Click opens VideoModal
- [ ] VideoModal shows correct video
- [ ] "Play as Audio Only" returns to FloatingPlayer
- [ ] Audio position maintained during switch
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly

## Future Enhancements

Potential improvements:

- Picture-in-picture mode for video
- Remember user's video/audio preference
- Thumbnail preview on hover
- Video quality selector
- Playback speed control (shared between audio/video)

## Comparison with MiniPlayer

Both players now have identical video toggle functionality:

| Feature                | MiniPlayer       | FloatingPlayer |
| ---------------------- | ---------------- | -------------- |
| Video button location  | Options menu     | Direct button  |
| Button visibility      | Always (in menu) | Conditional    |
| VideoModal integration | ✅               | ✅             |
| Switch back to audio   | ✅               | ✅             |
| Seamless playback      | ✅               | ✅             |

## Files Modified

- `apps/web/components/FloatingPlayer.tsx`
  - Added VideoModal import
  - Added video state management
  - Added video buttons (compact & expanded)
  - Added VideoModal component

## Dependencies

- `VideoModal` component (already existed)
- `state.currentAudio.youtubeId` from AudioPlayerContext
- YouTube video URL format

## No Breaking Changes

- Existing functionality unchanged
- Purely additive feature
- Backward compatible
- No API changes
