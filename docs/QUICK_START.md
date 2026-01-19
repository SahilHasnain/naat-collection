# Quick Start - Responsive Player

## What You Got

✅ **Desktop (≥768px)**: Draggable floating player with 3 modes
✅ **Mobile (<768px)**: Bottom bar + full-screen modal
✅ **Automatic switching**: Resizes between modes seamlessly
✅ **Dev helper**: Shows current mode in bottom-left corner

## Try It Now

### 1. Start the Dev Server

```bash
cd apps/web
npm run dev
```

### 2. Open Browser

```
http://localhost:3000
```

### 3. Test Desktop Mode

1. Make browser window wide (>768px)
2. Click any naat card
3. **FloatingPlayer** appears in bottom-right
4. Try these:
   - Drag it around
   - Click expand (⤢ icon)
   - Click minimize (− icon)
   - Refresh page (position remembered!)

### 4. Test Mobile Mode

1. Resize browser to narrow (<768px)
   - Or press F12 → Toggle device toolbar
2. Click any naat card
3. **MiniPlayer** appears at bottom
4. Try these:
   - Tap to expand to full screen
   - Tap down arrow to collapse
   - Tap X to close

### 5. Test Responsive Switch

1. Play a naat in desktop mode
2. Slowly resize browser across 768px
3. Watch it switch between players
4. Audio keeps playing!

## What's Where

### New Files

```
components/
├── FloatingPlayer.tsx      ← Desktop player
├── ResponsivePlayer.tsx    ← Wrapper (switches players)
└── DevScreenSize.tsx       ← Dev helper (bottom-left)

hooks/
└── useMediaQuery.ts        ← Detects screen size

Documentation/
├── QUICK_START.md          ← This file
├── IMPLEMENTATION_SUMMARY.md
├── RESPONSIVE_PLAYER.md
├── TESTING_RESPONSIVE_PLAYER.md
├── FLOATING_PLAYER.md
├── PLAYER_COMPARISON.md
└── ARCHITECTURE_DIAGRAM.md
```

### Existing Files (Still Used)

```
components/
├── MiniPlayer.tsx          ← Mobile bottom bar
├── FullPlayerModal.tsx     ← Mobile full screen
└── VideoModal.tsx          ← Video playback

contexts/
└── AudioPlayerContext.tsx  ← Shared state
```

## Dev Helper (Bottom-Left Corner)

Shows:

- Current window size (e.g., "1920x1080")
- Active mode ("Desktop (Floating)" or "Mobile (Mini)")
- Breakpoint (768px)

**Auto-hides in production** (`NODE_ENV=production`)

To remove manually:

```tsx
// app/layout.tsx
// Comment out or remove:
<DevScreenSize />
```

## Customization

### Change Breakpoint

```tsx
// hooks/useMediaQuery.ts
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)"); // Change here
}
```

### Change Initial Position (Desktop)

```tsx
// components/FloatingPlayer.tsx
// Line ~30
setPosition({
  x: window.innerWidth - 320 - 24, // Right padding
  y: window.innerHeight - 120 - 24, // Bottom padding
});
```

### Styling

All styles use Tailwind CSS. Colors defined in:

```
app/globals.css
```

## Common Issues

### "Player doesn't appear"

- Check console for errors
- Verify audio URL is valid
- Check AudioPlayerContext is wrapping app

### "Both players show at once"

- Clear localStorage: `localStorage.clear()`
- Hard refresh: Ctrl+Shift+R

### "Position resets on desktop"

- Check localStorage is enabled
- Check browser privacy settings

### "Hydration error"

- Should not happen (useMediaQuery handles SSR)
- If it does, check console and report

## Next Steps

1. **Test thoroughly** - See `TESTING_RESPONSIVE_PLAYER.md`
2. **Customize styling** - Match your brand colors
3. **Add features** - Queue, lyrics, volume control
4. **Deploy** - Remove DevScreenSize first

## Need Help?

Check documentation:

- **Architecture**: `ARCHITECTURE_DIAGRAM.md`
- **Testing**: `TESTING_RESPONSIVE_PLAYER.md`
- **Details**: `RESPONSIVE_PLAYER.md`
- **Comparison**: `PLAYER_COMPARISON.md`

## Production Checklist

Before deploying:

- [ ] Remove `<DevScreenSize />` from layout.tsx
- [ ] Test on real mobile devices
- [ ] Test on various browsers
- [ ] Check console for errors
- [ ] Verify localStorage works
- [ ] Test keyboard navigation
- [ ] Check bundle size

## That's It!

You now have a fully responsive audio player that works great on both desktop and mobile. Enjoy! 🎵
