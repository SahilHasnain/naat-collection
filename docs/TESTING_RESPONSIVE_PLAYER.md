# Testing the Responsive Player

## Quick Test Guide

### 1. Desktop Mode (≥768px)

**Setup:**

- Open browser at full width (>768px)
- Look for "Desktop (Floating)" indicator in bottom-left corner

**Test FloatingPlayer:**

1. Click any naat card
2. ✅ FloatingPlayer should appear in bottom-right corner (compact mode)
3. ✅ Drag the player around the screen
4. ✅ Click expand button → Should show full controls
5. ✅ Click minimize button → Should shrink to small circle
6. ✅ Click the circle → Should expand back to compact
7. ✅ Refresh page → Position should be remembered
8. ✅ Browse naats while audio plays → Player stays visible

### 2. Mobile Mode (<768px)

**Setup:**

- Resize browser to <768px width (or use DevTools mobile view)
- Look for "Mobile (Mini)" indicator in bottom-left corner

**Test MiniPlayer:**

1. Click any naat card
2. ✅ MiniPlayer should appear at bottom (fixed bar)
3. ✅ Tap MiniPlayer → FullPlayerModal should cover screen
4. ✅ Tap down arrow → Should return to MiniPlayer
5. ✅ Tap close (X) → Should stop playback
6. ✅ Play/pause works in both mini and full views

### 3. Responsive Transition

**Test switching between modes:**

1. Start with desktop width (>768px)
2. Play a naat → FloatingPlayer appears
3. Resize browser to <768px
4. ✅ Should switch to MiniPlayer
5. Resize back to >768px
6. ✅ Should switch back to FloatingPlayer
7. ✅ Audio continues playing during transitions
8. ✅ No console errors

### 4. Edge Cases

**Test these scenarios:**

- [ ] Play audio, minimize browser, restore → Player still works
- [ ] Play audio, switch tabs, return → Player still works
- [ ] Play audio, refresh page → Player disappears (expected)
- [ ] Drag FloatingPlayer off-screen → Should stay within bounds
- [ ] Resize window while dragging → Should handle gracefully

## Development Helper

The `DevScreenSize` component (bottom-left corner) shows:

- Current window dimensions
- Active player mode (Desktop/Mobile)
- Breakpoint threshold (768px)

**To remove in production:**

- It only shows in `NODE_ENV=development`
- Or remove `<DevScreenSize />` from layout.tsx

## Browser DevTools Testing

### Chrome/Edge DevTools

1. Press F12
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select device presets:
   - iPhone SE (375px) → Mobile mode
   - iPad (768px) → Desktop mode
   - Desktop (1920px) → Desktop mode

### Firefox DevTools

1. Press F12
2. Click "Responsive Design Mode" (Ctrl+Shift+M)
3. Test various widths around 768px breakpoint

## Common Issues

### Issue: Player doesn't switch when resizing

**Solution:** Hard refresh (Ctrl+Shift+R) to clear cache

### Issue: Hydration error in console

**Solution:** The `useMediaQuery` hook handles this - should not occur

### Issue: FloatingPlayer position resets

**Solution:** Check localStorage is enabled in browser

### Issue: Both players show at once

**Solution:** Clear browser cache and localStorage

## Performance Checks

- [ ] No layout shift when player appears
- [ ] Smooth dragging on desktop
- [ ] No lag when switching modes
- [ ] Audio continues without interruption
- [ ] No memory leaks (check DevTools Performance tab)

## Accessibility Testing

### Keyboard Navigation

- [ ] Tab through all player controls
- [ ] Space bar plays/pauses
- [ ] Enter activates buttons
- [ ] Escape closes modals (mobile)

### Screen Reader

- [ ] All buttons have aria-labels
- [ ] Player state announced
- [ ] Time updates announced

## Next Steps

After testing, you can:

1. Remove `<DevScreenSize />` from layout.tsx
2. Adjust breakpoint if needed (currently 768px)
3. Add more features to either player
4. Customize styling for your brand
