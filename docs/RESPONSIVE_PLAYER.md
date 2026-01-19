# Responsive Player Implementation

## Overview

The app now uses a responsive player system that adapts to screen size:

- **Desktop (≥768px)**: FloatingPlayer - draggable widget
- **Mobile (<768px)**: MiniPlayer + FullPlayerModal - mobile-optimized

## Architecture

### Components

```
ResponsivePlayer (wrapper)
├── Desktop: FloatingPlayer
│   ├── Minimized (64x64 circle)
│   ├── Compact (320px wide)
│   └── Expanded (384px wide)
└── Mobile: MiniPlayer + FullPlayerModal
    ├── MiniPlayer (bottom bar)
    └── FullPlayerModal (full-screen overlay)
```

### Media Query Hook

```tsx
// useMediaQuery.ts
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
```

### Responsive Wrapper

```tsx
// ResponsivePlayer.tsx
export function ResponsivePlayer() {
  const isDesktop = useIsDesktop();
  return isDesktop ? <FloatingPlayer /> : <MiniPlayer />;
}
```

## Desktop Experience (FloatingPlayer)

### Features

- **Draggable**: Position anywhere on screen
- **Three Display Modes**:
  1. Minimized - 64x64px circle with thumbnail
  2. Compact - 320px mini player with basic controls
  3. Expanded - 384px full controls with seek bar
- **Persistent Position**: Saved in localStorage
- **Non-blocking**: Browse while listening

### User Flow

1. Click naat → FloatingPlayer appears (compact mode)
2. Drag to preferred position
3. Click expand → Full controls
4. Click minimize → Small circle
5. Browse content freely

## Mobile Experience (MiniPlayer + FullPlayerModal)

### Features

- **Bottom Bar**: Fixed 72px height mini player
- **Full-Screen Modal**: Tap to expand for full controls
- **Touch-Optimized**: Large tap targets
- **Familiar Pattern**: Standard mobile music player UX

### User Flow

1. Click naat → MiniPlayer appears at bottom
2. Tap MiniPlayer → FullPlayerModal takes over screen
3. Swipe down or tap back → Return to MiniPlayer
4. Tap close → Stop playback

## Implementation Details

### SSR Handling

The `useMediaQuery` hook handles server-side rendering:

- Returns `false` during SSR to avoid hydration mismatch
- Sets correct value after mount on client
- Prevents flash of wrong component

### Breakpoint

- **Desktop**: `min-width: 768px` (Tailwind's `md` breakpoint)
- **Mobile**: `max-width: 767px`

### Why 768px?

- Standard tablet/desktop breakpoint
- Matches Tailwind's `md` breakpoint
- Provides enough space for FloatingPlayer dragging
- Mobile devices typically <768px in portrait

## Testing

### Desktop (≥768px)

- [ ] FloatingPlayer appears when audio plays
- [ ] Can drag player around screen
- [ ] Position persists on page reload
- [ ] Can minimize to circle
- [ ] Can expand to full controls
- [ ] Doesn't block content browsing

### Mobile (<768px)

- [ ] MiniPlayer appears at bottom
- [ ] Tap expands to FullPlayerModal
- [ ] Modal covers entire screen
- [ ] Can close modal back to MiniPlayer
- [ ] Touch controls work smoothly

### Responsive Transition

- [ ] Resizing window switches players correctly
- [ ] No hydration errors in console
- [ ] Smooth transition between modes

## Future Enhancements

### Desktop

- Snap to edges when dragging near borders
- Remember size preference (compact vs expanded)
- Keyboard shortcuts (space, arrows, etc.)
- Queue management in expanded mode
- Volume control slider

### Mobile

- Swipe gestures for seek
- Haptic feedback on controls
- Lock screen controls
- Background audio support

### Both

- Lyrics display
- Playback speed control
- Sleep timer
- Equalizer settings
