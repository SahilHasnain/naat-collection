# Share Feature - Quick Start Guide

## For Users

### How to Share a Naat

**Option 1: From Full Player**
1. Play any naat
2. Tap the three dots (⋮) at top right
3. Tap "Share"
4. Choose where to share (WhatsApp, SMS, etc.)

**Option 2: From Mini Player**
1. Play any naat (mini player appears at bottom)
2. Tap the share icon (🔗)
3. Choose where to share

**Option 3: From Home Screen**
1. Long-press any naat card
2. Tap "Share" button
3. Choose where to share

### How to Open Shared Naats

When you receive a shared naat:
1. Tap "Open in app" link
2. App opens automatically and plays the naat
3. If app not installed, tap the YouTube link instead

## For Developers

### Testing Deep Links

**iOS Simulator:**
```bash
xcrun simctl openurl booted "ubaidraza://naat/test123?youtubeId=abc"
```

**Android Emulator:**
```bash
adb shell am start -W -a android.intent.action.VIEW -d "ubaidraza://naat/test123?youtubeId=abc"
```

### Deep Link Format
```
ubaidraza://naat/{naatId}?youtubeId={youtubeId}
```

### Key Files
- `services/shareService.ts` - Share logic
- `hooks/useDeepLinking.ts` - Deep link handling
- `app.config.js` - Platform configuration

### Adding Share to New Components

```typescript
import { shareService } from "@/services/shareService";

// Share a specific naat
await shareService.shareNaat(naat);

// Share currently playing audio
await shareService.shareCurrentAudio(
  title,
  channelName,
  youtubeId,
  naatId
);
```

### Debugging

1. Check console logs for deep link events
2. Check Sentry for errors
3. Verify app.config.js has correct scheme
4. Test on physical device (simulators may behave differently)

## Troubleshooting

### Deep Link Not Opening App

**iOS:**
- Rebuild app after config changes
- Check URL scheme in app.config.js
- Test with `xcrun simctl openurl`

**Android:**
- Rebuild app after config changes
- Check intent filters in app.config.js
- Test with `adb shell am start`

### Share Button Not Appearing

- Check if component imports shareService
- Verify button is not hidden by conditional rendering
- Check console for errors

### Naat Not Playing After Deep Link

- Check if naatId is valid
- Verify naat exists in database
- Check console logs for errors
- Ensure AudioMetadata includes naatId

## Support

- Documentation: `apps/mobile/docs/`
- Deep Linking: `DEEP_LINKING.md`
- Full Guide: `SHARE_FEATURE.md`
- Summary: `SHARE_WITH_DEEP_LINKING_SUMMARY.md`
