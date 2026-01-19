# Responsive Player Architecture

## Component Hierarchy

```
RootLayout (app/layout.tsx)
│
├── AudioPlayerProvider (contexts/AudioPlayerContext.tsx)
│   │
│   ├── <main>{children}</main>
│   │
│   ├── ResponsivePlayer (components/ResponsivePlayer.tsx)
│   │   │
│   │   ├── useIsDesktop() hook
│   │   │
│   │   ├── [Desktop ≥768px] FloatingPlayer
│   │   │   ├── Minimized (64x64 circle)
│   │   │   ├── Compact (320px mini)
│   │   │   └── Expanded (384px full)
│   │   │
│   │   └── [Mobile <768px] MiniPlayer
│   │       ├── Bottom bar (72px)
│   │       └── FullPlayerModal (on tap)
│   │
│   └── DevScreenSize (dev only)
```

## Data Flow

```
User Action (Click Naat)
        ↓
NaatCard.handleClick()
        ↓
AudioPlayerContext.loadAndPlay()
        ↓
    State Update
        ↓
ResponsivePlayer re-renders
        ↓
    ┌─────────────┴─────────────┐
    ↓                           ↓
Desktop (≥768px)          Mobile (<768px)
FloatingPlayer            MiniPlayer
    ↓                           ↓
Renders with              Renders at
current state             bottom
```

## State Management

```
AudioPlayerContext
├── State
│   ├── currentAudio (AudioMetadata | null)
│   ├── isPlaying (boolean)
│   ├── position (number)
│   ├── duration (number)
│   ├── volume (number)
│   └── isLoading (boolean)
│
└── Actions
    ├── loadAndPlay(audio)
    ├── togglePlayPause()
    ├── seek(position)
    ├── setVolume(volume)
    └── stop()
```

## FloatingPlayer State (Desktop)

```
FloatingPlayer
├── Local State
│   ├── size: "minimized" | "compact" | "expanded"
│   ├── position: { x: number, y: number }
│   ├── isDragging: boolean
│   └── dragOffset: { x: number, y: number }
│
├── Persisted (localStorage)
│   └── floatingPlayerPosition: { x, y }
│
└── Derived from AudioPlayerContext
    ├── currentAudio
    ├── isPlaying
    ├── position
    └── duration
```

## MiniPlayer State (Mobile)

```
MiniPlayer
├── Local State
│   ├── isModalOpen: boolean
│   └── isVideoModalOpen: boolean
│
└── Derived from AudioPlayerContext
    ├── currentAudio
    ├── isPlaying
    ├── position
    └── duration
```

## Media Query Hook Flow

```
useMediaQuery(query)
        ↓
    useEffect()
        ↓
window.matchMedia(query)
        ↓
    addEventListener("change")
        ↓
    setState(matches)
        ↓
    Return boolean
        ↓
useIsDesktop() / useIsMobile()
        ↓
ResponsivePlayer
```

## Responsive Breakpoint Logic

```
Window Width
    │
    ├── < 768px  → Mobile
    │   └── Render: MiniPlayer + FullPlayerModal
    │
    └── ≥ 768px  → Desktop
        └── Render: FloatingPlayer
```

## FloatingPlayer Modes

```
Minimized (64x64)
    ↓ click
Compact (320px)
    ↓ expand button
Expanded (384px)
    ↓ collapse button
Compact (320px)
    ↓ minimize button
Minimized (64x64)
```

## MiniPlayer Flow

```
MiniPlayer (bottom bar)
    ↓ tap anywhere
FullPlayerModal (full screen)
    ↓ tap down arrow
MiniPlayer (bottom bar)
    ↓ tap close (X)
Player removed
```

## Drag and Drop (Desktop)

```
User mousedown on header
    ↓
setIsDragging(true)
Store dragOffset
    ↓
User moves mouse
    ↓
Calculate new position
Clamp to viewport bounds
    ↓
setPosition({ x, y })
    ↓
User mouseup
    ↓
setIsDragging(false)
Save to localStorage
```

## SSR Handling

```
Server Side Render
    ↓
useMediaQuery returns false
    ↓
ResponsivePlayer renders null/placeholder
    ↓
Client Side Hydration
    ↓
useEffect runs
    ↓
window.matchMedia available
    ↓
setState(actual value)
    ↓
ResponsivePlayer renders correct player
```

## Event Listeners

```
FloatingPlayer
├── mousedown (drag start)
├── mousemove (dragging)
├── mouseup (drag end)
└── window.resize (position bounds)

MiniPlayer
├── click (expand)
└── touch events (mobile)

AudioPlayerContext
├── audio.play
├── audio.pause
├── audio.timeupdate
├── audio.loadedmetadata
├── audio.ended
└── audio.error
```

## File Dependencies

```
layout.tsx
    ↓
ResponsivePlayer.tsx
    ↓
    ├── useMediaQuery.ts
    │   └── useIsDesktop()
    │
    ├── FloatingPlayer.tsx
    │   └── AudioPlayerContext
    │
    └── MiniPlayer.tsx
        ├── AudioPlayerContext
        ├── FullPlayerModal.tsx
        └── VideoModal.tsx
```

## Styling Architecture

```
globals.css
├── Theme variables
├── Base styles
├── Scrollbar styles
├── Animations
│   ├── fadeIn
│   ├── fadeOut
│   ├── slideUp
│   └── slideDown
└── Slider styles
    ├── webkit-slider-thumb
    ├── moz-range-thumb
    └── progress gradient

Components
└── Tailwind utility classes
    ├── Layout (fixed, absolute, flex)
    ├── Spacing (p-*, m-*, gap-*)
    ├── Colors (bg-*, text-*)
    ├── Borders (rounded-*, border-*)
    └── Transitions (hover:*, transition-*)
```

## Performance Optimization Opportunities

```
Current
├── Re-renders on every state change
├── No memoization
└── All components in bundle

Potential Improvements
├── React.memo() on player components
├── useMemo() for expensive calculations
├── useCallback() for event handlers
├── Code splitting (lazy load players)
└── Virtual scrolling for queue (future)
```

## Testing Strategy

```
Unit Tests
├── useMediaQuery hook
├── AudioPlayerContext actions
└── Component rendering

Integration Tests
├── Player switching on resize
├── Audio playback flow
└── Drag and drop

E2E Tests
├── Full user journey
├── Cross-browser testing
└── Mobile device testing
```
