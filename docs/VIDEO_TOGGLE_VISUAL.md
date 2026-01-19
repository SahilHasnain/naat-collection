# Video Toggle - Visual Guide

## FloatingPlayer with Video Button

### Compact Mode - With Video Button

```
┌────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← Progress bar (green)
├────────────────────────────────┤
│ ┌──┐                           │
│ │▓▓│ Naat Title                │
│ │▓▓│ Channel Name              │
│ └──┘                           │
├────────────────────────────────┤
│ 0:45  ▶  3:20  ⤢  −  ✕       │
│                                │
│ ┌──────────────────────────┐  │
│ │  📹 Video                │  │ ← NEW: Video button
│ └──────────────────────────┘  │
└────────────────────────────────┘
     320px wide
```

### Expanded Mode - With Video Button

```
┌──────────────────────────────────┐
│ Now Playing              ▼  ✕   │
├──────────────────────────────────┤
│                                  │
│      ┌──────────────────┐       │
│      │                  │       │
│      │                  │       │
│      │   Album Art      │       │
│      │                  │       │
│      │                  │       │
│      └──────────────────┘       │
│                                  │
│         Naat Title               │
│         Channel Name             │
│                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  0:45                     3:20   │
│                                  │
│       ⏪    ▶    ⏩             │
│                                  │
│  ┌────────────────────────────┐ │
│  │  📹 Switch to Video        │ │ ← NEW: Video button
│  └────────────────────────────┘ │
└──────────────────────────────────┘
        384px wide
```

## User Flow

### 1. Audio Playing (Compact)

```
┌────────────────┐
│ ▓ Title        │
│ ▓ Artist       │
│ 0:45 ▶ 3:20   │
│ [📹 Video]     │ ← Click here
└────────────────┘
```

### 2. Video Modal Opens

```
┌─────────────────────────────────┐
│ Title                        ✕  │
│ Channel Name                    │
├─────────────────────────────────┤
│                                 │
│                                 │
│      YouTube Video Player       │
│                                 │
│                                 │
├─────────────────────────────────┤
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 0:45                     3:20   │
│                                 │
│ [🔁 Repeat]                     │
│                                 │
│ [🎵 Play as Audio Only]         │ ← Click to return
└─────────────────────────────────┘
```

### 3. Back to Audio (Compact)

```
┌────────────────┐
│ ▓ Title        │
│ ▓ Artist       │
│ 0:45 ▶ 3:20   │ ← Audio continues
│ [📹 Video]     │
└────────────────┘
```

## Button States

### Compact Mode Button

**Normal State:**

```
┌──────────────────────────┐
│  📹 Video                │
└──────────────────────────┘
bg-blue-600, text-white
```

**Hover State:**

```
┌──────────────────────────┐
│  📹 Video                │ ← Slightly darker
└──────────────────────────┘
bg-blue-700, text-white
```

**Focus State (Keyboard):**

```
┌──────────────────────────┐
│  📹 Video                │ ← Focus ring
└──────────────────────────┘
outline-blue-500
```

### Expanded Mode Button

**Normal State:**

```
┌────────────────────────────┐
│  📹 Switch to Video        │
└────────────────────────────┘
bg-blue-600, text-white, font-medium
```

**Hover State:**

```
┌────────────────────────────┐
│  📹 Switch to Video        │ ← Slightly darker
└────────────────────────────┘
bg-blue-700, text-white
```

## Conditional Rendering

### With YouTube ID

```
state.currentAudio.youtubeId = "abc123"
                ↓
        Button appears
```

### Without YouTube ID

```
state.currentAudio.youtubeId = null
                ↓
        Button hidden
```

## Color Coding

### Audio Controls (Green)

```
Progress bar: #1DB954 (accent-primary)
Seek slider:  #1DB954 (accent-primary)
```

### Video Button (Blue)

```
Button bg:    #2563EB (blue-600)
Button hover: #1D4ED8 (blue-700)
```

### Neutral Elements (Gray)

```
Background:   #262626 (neutral-800)
Text:         #FFFFFF (white)
Secondary:    #A3A3A3 (neutral-400)
```

## Responsive Behavior

### Desktop (≥768px)

```
FloatingPlayer with video button
        ↓
Click video button
        ↓
VideoModal opens full-screen
        ↓
Click "Play as Audio Only"
        ↓
Back to FloatingPlayer
```

### Mobile (<768px)

```
MiniPlayer with options menu
        ↓
Tap options → "Switch to Video"
        ↓
VideoModal opens full-screen
        ↓
Tap "Play as Audio Only"
        ↓
Back to MiniPlayer
```

## Accessibility

### Keyboard Navigation

```
Tab → Focus on video button
Enter/Space → Activate button
Escape → Close video modal
```

### Screen Reader

```
Button: "Switch to video mode"
Icon: Decorative (not announced)
```

## Animation

### Button Hover

```
Normal → Hover
  ↓
Background darkens (150ms ease)
Cursor changes to pointer
```

### Modal Open

```
FloatingPlayer visible
        ↓
Fade in (300ms)
        ↓
VideoModal covers screen
```

### Modal Close

```
VideoModal visible
        ↓
Fade out (200ms)
        ↓
FloatingPlayer visible
```

## Layout Spacing

### Compact Mode

```
Controls row:     gap-2 (8px)
Video button:     mt-2 (8px from controls)
Button padding:   py-2 px-3 (8px/12px)
Button height:    ~32px
```

### Expanded Mode

```
Controls:         gap-6 (24px)
Video button:     mt-4 (16px from controls)
Button padding:   py-3 px-4 (12px/16px)
Button height:    ~44px
```

## Z-Index Layers

```
Layer 3: VideoModal (z-50)
Layer 2: FloatingPlayer (z-50)
Layer 1: Page content (z-0)
```

## Touch Targets (Mobile)

```
Minimum: 44x44px (iOS guideline)

Compact button:  100% width × 32px height
Expanded button: 100% width × 44px height
```

## Icon Details

### Video Icon SVG

```svg
<svg viewBox="0 0 24 24">
  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
</svg>
```

Size:

- Compact: 16×16px (w-4 h-4)
- Expanded: 20×20px (w-5 h-5)

## Edge Cases

### No YouTube ID

```
┌────────────────┐
│ ▓ Title        │
│ ▓ Artist       │
│ 0:45 ▶ 3:20   │
│                │ ← No video button
└────────────────┘
```

### Loading State

```
┌────────────────┐
│ ▓ Title        │
│ ▓ Artist       │
│ ⟳ Loading...   │
│ [📹 Video]     │ ← Button disabled
└────────────────┘
```

### Error State

```
┌────────────────┐
│ ▓ Title        │
│ ▓ Artist       │
│ ⚠ Error        │
│ [📹 Video]     │ ← Button still works
└────────────────┘
```

## Comparison: Before vs After

### Before (No Video Button)

```
┌────────────────┐
│ ▓ Title        │
│ ▓ Artist       │
│ 0:45 ▶ 3:20   │
│                │
└────────────────┘
```

### After (With Video Button)

```
┌────────────────┐
│ ▓ Title        │
│ ▓ Artist       │
│ 0:45 ▶ 3:20   │
│ [📹 Video]     │ ← NEW
└────────────────┘
```

## Testing Scenarios

### Scenario 1: Happy Path

```
1. Play naat with YouTube ID
2. See video button
3. Click video button
4. VideoModal opens
5. Click "Play as Audio Only"
6. Back to FloatingPlayer
✅ Success
```

### Scenario 2: No YouTube ID

```
1. Play naat without YouTube ID
2. No video button appears
3. Only audio controls visible
✅ Expected behavior
```

### Scenario 3: Keyboard Navigation

```
1. Tab to video button
2. Press Enter
3. VideoModal opens
4. Press Escape
5. Back to FloatingPlayer
✅ Accessible
```
