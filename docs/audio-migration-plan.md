# Audio Migration Plan: expo-av → react-native-track-player

## 🎯 Executive Summary

**Problem:** Background audio stops after ~30 seconds when app is backgrounded
**Root Cause:** expo-av has fundamental limitations for background playback
**Solution:** Migrate to react-native-track-player
**Approach:** Phased migration (4 sessions)
**Total Time:** ~2 hours with testing

---

## 🔴 Why We Need to Migrate

### expo-av Issues

1. **Deprecated in SDK 54** - Will be removed soon
2. **No background audio support** - Stops after ~30s in background
3. **No foreground service** - Android kills audio
4. **No lock screen controls** - Poor UX
5. **No notifications** - Can't control playback from notification
6. **JS thread dependent** - Audio stops when JS is paused

### react-native-track-player Benefits

1. ✅ **Full background audio** - Unlimited playback
2. ✅ **Foreground service** - Automatic on Android
3. ✅ **Lock screen controls** - Native integration
4. ✅ **Notifications** - Built-in media controls
5. ✅ **Native audio service** - Independent of JS thread
6. ✅ **Industry standard** - Used by major music apps

---

## 📋 Migration Phases

### **Phase 1+2: Core Migration (Session 1)**

**Goal:** Basic playback + background audio working
**Time:** ~45 minutes
**Risk:** Low

#### Tasks

1. Install react-native-track-player
2. Configure for Expo (app.json, plugins)
3. Create TrackPlayerService.ts
4. Update AudioContext.tsx:
   - Replace Audio.Sound with TrackPlayer
   - Implement play, pause, stop
   - Add background audio support
   - Keep state management
5. Test basic playback
6. Test background audio

#### Testing Checklist

- [ ] Audio plays successfully
- [ ] Pause/resume works
- [ ] Stop works
- [ ] Background app → audio continues
- [ ] Lock screen → audio continues
- [ ] Wait 5+ minutes → audio continues
- [ ] No double audio playback
- [ ] No auto-stopping mid-playback

#### Deliverable

Background audio works reliably ✅

---

### **Phase 3: Features (Session 2)**

**Goal:** Feature parity with expo-av
**Time:** ~20 minutes
**Risk:** Low

#### Tasks

1. Implement seek functionality
2. Add volume control
3. Implement repeat mode
4. Implement autoplay with callback
5. Add position/duration tracking
6. Test all features

#### Testing Checklist

- [ ] Seek works (slider)
- [ ] Volume control works
- [ ] Repeat mode works
- [ ] Autoplay works (plays next random track)
- [ ] Position updates correctly
- [ ] Duration displays correctly
- [ ] All UI components work unchanged

#### Deliverable

All existing features work ✅

---

### **Phase 4: Notifications (Session 3)**

**Goal:** Lock screen controls and notifications
**Time:** ~30 minutes
**Risk:** Medium

#### Tasks

1. Configure notification settings
2. Add notification metadata (title, artist, artwork)
3. Implement remote control handlers:
   - Play/pause from notification
   - Play/pause from lock screen
   - Play/pause from Bluetooth/headphones
4. Add artwork to notification
5. Test on physical device

#### Testing Checklist

- [ ] Notification appears when playing
- [ ] Notification shows correct title/artist
- [ ] Notification shows artwork
- [ ] Play/pause from notification works
- [ ] Lock screen controls work
- [ ] Bluetooth controls work
- [ ] Notification dismisses when stopped
- [ ] Notification persists in background

#### Deliverable

Full media player experience ✅

---

### **Phase 5: Cleanup (Session 4)**

**Goal:** Production ready
**Time:** ~15 minutes
**Risk:** Low

#### Tasks

1. Remove expo-av from package.json
2. Remove expo-av plugin from app.json
3. Clean up unused imports
4. Remove old Audio.Sound code
5. Update error handling
6. Add comments/documentation
7. Final regression testing

#### Testing Checklist

- [ ] No expo-av imports remain
- [ ] App builds successfully
- [ ] All features work
- [ ] No console warnings
- [ ] Background audio works
- [ ] Notifications work
- [ ] No memory leaks

#### Deliverable

Production ready code ✅

---

## 🚀 Execution Plan

### **Recommended Approach: Modified Phased**

#### Session 1: Core + Background (Phases 1+2)

**When:** Start immediately
**Duration:** 45 minutes
**Goal:** Fix background audio issue

**Why start here:**

- Solves the main problem
- Low risk, can rollback
- Quick win
- Can pause after this if needed

#### Session 2: Features (Phase 3)

**When:** After Session 1 succeeds
**Duration:** 20 minutes
**Goal:** Feature parity

**Why separate:**

- Independent from core
- Can be tested separately
- Lower priority than background audio

#### Session 3: Notifications (Phase 4)

**When:** After Session 2 succeeds
**Duration:** 30 minutes
**Goal:** Enhanced UX

**Why separate:**

- Most complex phase
- Platform-specific behavior
- Nice-to-have, not critical

#### Session 4: Cleanup (Phase 5)

**When:** After everything works
**Duration:** 15 minutes
**Goal:** Production ready

**Why last:**

- Only after everything is tested
- Removes fallback options
- Final polish

---

## 📊 Risk Assessment

| Phase             | Risk Level | Impact if Fails | Can Rollback? | Priority |
| ----------------- | ---------- | --------------- | ------------- | -------- |
| 1+2 (Core)        | Low        | High            | ✅ Yes        | Critical |
| 3 (Features)      | Low        | Medium          | ✅ Yes        | High     |
| 4 (Notifications) | Medium     | Low             | ✅ Yes        | Medium   |
| 5 (Cleanup)       | Low        | Low             | ⚠️ Harder     | Low      |

---

## 🔧 Technical Details

### Current Architecture

```typescript
// AudioContext.tsx
- Uses expo-av (Audio.Sound)
- State management with React Context
- Refs for stable callbacks
- AppState monitoring (doesn't help enough)
```

### New Architecture

```typescript
// AudioContext.tsx
- Uses react-native-track-player
- Same state management (no changes)
- Same refs pattern (no changes)
- Native background service (automatic)
- Foreground service (automatic)
- Media session (automatic)
```

### API Comparison

```typescript
// expo-av
const { sound } = await Audio.Sound.createAsync({ uri });
await sound.playAsync();
await sound.pauseAsync();
await sound.stopAsync();

// react-native-track-player
await TrackPlayer.add({ url, title, artist, artwork });
await TrackPlayer.play();
await TrackPlayer.pause();
await TrackPlayer.reset();
```

**Good news:** APIs are very similar!

---

## 📝 Files to Modify

### Phase 1+2

- [ ] `package.json` - Add react-native-track-player
- [ ] `app.json` - Add track player plugin
- [ ] `services/TrackPlayerService.ts` - NEW FILE
- [ ] `contexts/AudioContext.tsx` - Major changes
- [ ] `android/gradle.properties` - Already has NDK 26 ✅

### Phase 3

- [ ] `contexts/AudioContext.tsx` - Add features

### Phase 4

- [ ] `services/TrackPlayerService.ts` - Add notification config
- [ ] `contexts/AudioContext.tsx` - Add remote handlers

### Phase 5

- [ ] `package.json` - Remove expo-av
- [ ] `app.json` - Remove expo-av plugin
- [ ] `contexts/AudioContext.tsx` - Remove old imports

### No Changes Needed

- ✅ `components/MiniPlayer.tsx` - Uses context API
- ✅ `components/FullPlayerModal.tsx` - Uses context API
- ✅ `app/_layout.tsx` - Uses context API
- ✅ `app/index.tsx` - Uses context API

**Why?** We're keeping the same AudioContext API!

---

## 🎯 Success Criteria

### Must Have (Phase 1+2)

- [x] Audio plays successfully
- [x] Background audio works indefinitely
- [x] No auto-stopping
- [x] No double audio playback

### Should Have (Phase 3)

- [ ] All features work (seek, volume, repeat, autoplay)
- [ ] UI components work unchanged
- [ ] Position/duration tracking accurate

### Nice to Have (Phase 4)

- [ ] Lock screen controls
- [ ] Notification with artwork
- [ ] Bluetooth/headphone controls

### Production Ready (Phase 5)

- [ ] No expo-av dependencies
- [ ] Clean code
- [ ] No warnings
- [ ] Fully tested

---

## 🚨 Rollback Plan

### If Phase 1+2 Fails

1. Revert AudioContext.tsx changes
2. Remove react-native-track-player from package.json
3. Keep expo-av (accept limitations)
4. Document issues for future attempt

### If Phase 3 Fails

1. Revert feature additions
2. Keep basic playback working
3. Add features one by one

### If Phase 4 Fails

1. Keep audio working without notifications
2. Debug notification issues separately
3. Can ship without notifications if needed

---

## 📚 Resources

### Documentation

- [react-native-track-player docs](https://react-native-track-player.js.org/)
- [Expo integration guide](https://react-native-track-player.js.org/docs/basics/installation#expo)
- [Background playback guide](https://react-native-track-player.js.org/docs/basics/background-mode)

### Examples

- [Example app](https://github.com/doublesymmetry/react-native-track-player/tree/main/example)
- [Expo example](https://github.com/doublesymmetry/react-native-track-player/tree/main/example-expo)

---

## 🎯 Next Steps

### Immediate Action

**Start Session 1 (Phases 1+2)**

1. Install react-native-track-player
2. Configure for Expo
3. Create TrackPlayerService
4. Update AudioContext
5. Test background audio

**Expected outcome:** Background audio works ✅

### After Session 1

- If successful → Continue to Session 2
- If issues → Debug and retry
- Can pause here if needed

---

## 📊 Timeline

| Session           | Duration | Cumulative | Can Pause After?             |
| ----------------- | -------- | ---------- | ---------------------------- |
| 1 (Core)          | 45 min   | 45 min     | ✅ Yes (main issue solved)   |
| 2 (Features)      | 20 min   | 65 min     | ✅ Yes (basic features work) |
| 3 (Notifications) | 30 min   | 95 min     | ✅ Yes (full features work)  |
| 4 (Cleanup)       | 15 min   | 110 min    | ✅ Done!                     |

**Total:** ~2 hours with testing

---

## ✅ Decision

**Approach:** Phased migration (4 sessions)
**Start with:** Session 1 (Phases 1+2)
**Reason:** Solves main problem, low risk, can pause after

**Ready to begin!** 🚀
