# Share Feature - UI Locations

## 1. Full Player Modal
**Location:** Options Menu (Three Dots Icon)

```
┌─────────────────────────────────┐
│  [Video] ................ [⋮]   │ ← Tap three dots
│                                 │
│                                 │
│      [Album Art/Thumbnail]      │
│                                 │
│                                 │
│      ═══════════════════        │
│      0:45          3:30         │
│                                 │
│    [⏮] [▶️/⏸] [⏭]              │
└─────────────────────────────────┘

Options Menu:
┌─────────────────────────┐
│ 📥 Download             │
│ 🔗 Share               │ ← NEW!
│ 🔁 Repeat               │
│ ⏭️ Autoplay             │
│ 🔄 A/B Repeat           │
└─────────────────────────┘
```

## 2. Mini Player
**Location:** Between Play/Pause and Close buttons

```
┌─────────────────────────────────────────────┐
│ [🖼️] Title of Naat...  [▶️] [🔗] [✕]      │
│                                             │
└─────────────────────────────────────────────┘
                                    ↑
                              Share button
```

## 3. Home Screen - Long Press Action Sheet
**Location:** Bottom sheet after long-pressing a naat card

```
Home Screen:
┌─────────────────────────────────┐
│  [Naat Card 1]                  │ ← Long press
│  [Naat Card 2]                  │
│  [Naat Card 3]                  │
└─────────────────────────────────┘

Action Sheet appears:
┌─────────────────────────────────┐
│  ─────                          │
│                                 │
│  [📥 Download] [▶️ Play as...]  │
│                                 │
│  [🔗 Share]                     │ ← NEW!
│                                 │
└─────────────────────────────────┘
```

## Share Flow

```
User Action → Share Button
              ↓
        Native Share Sheet
              ↓
    ┌─────────────────────┐
    │  WhatsApp           │
    │  Messages           │
    │  Email              │
    │  Copy Link          │
    │  More...            │
    └─────────────────────┘
              ↓
        User Selects App
              ↓
    ✅ Success Toast
```

## Shared Content Example

```
🎵 Ya Nabi Salam Alayka

By: Owais Raza Qadri

https://youtu.be/abc123xyz
```

## Accessibility

All share buttons include:
- `accessibilityRole="button"`
- `accessibilityLabel="Share"`
- Proper touch target size (minimum 44x44 points)
- Visual feedback on press
- Screen reader support
