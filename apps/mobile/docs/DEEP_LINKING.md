# Deep Linking Implementation

## Overview
The app now supports deep linking, allowing shared naats to open directly in the app when clicked. If the app is not installed, the link falls back to YouTube.

## Deep Link Format

```
ubaidraza://naat/{naatId}?youtubeId={youtubeId}
```

### Example
```
ubaidraza://naat/abc123?youtubeId=dQw4w9WgXcQ
```

## How It Works

### 1. Sharing Flow
When a user shares a naat:
1. App generates a deep link with the naat ID and YouTube ID
2. Share message includes:
   - Deep link for opening in app
   - YouTube fallback link
3. Recipient can tap either link

### 2. Opening Flow
When a deep link is opened:
1. OS checks if app is installed
2. If installed: Opens app and navigates to naat
3. If not installed: User can manually open YouTube link

### 3. In-App Handling
When app receives a deep link:
1. `useDeepLinking` hook intercepts the URL
2. Parses naatId and youtubeId from URL
3. Navigates to home screen with auto-play params
4. Home screen loads and plays the naat

## Implementation Files

### Core Files
- **`services/shareService.ts`** - Generates deep links when sharing
- **`hooks/useDeepLinking.ts`** - Handles incoming deep links
- **`app/_layout.tsx`** - Initializes deep linking hook
- **`app/home.tsx`** - Handles auto-play from deep links

### Configuration
- **`app.config.js`** - Defines URL scheme and intent filters

## Platform Configuration

### Android
Intent filters configured in `app.config.js`:
```javascript
intentFilters: [
  {
    action: "VIEW",
    autoVerify: true,
    data: [
      {
        scheme: "ubaidraza",
        host: "*",
      },
    ],
    category: ["BROWSABLE", "DEFAULT"],
  },
]
```

### iOS
URL scheme configured in `app.config.js`:
```javascript
scheme: "ubaidraza"
associatedDomains: ["applinks:ubaidraza.app"]
```

## Shared Content Format

When sharing a naat, the message includes:

```
🎵 [Naat Title]

By: [Channel Name]

Open in app: ubaidraza://naat/[naatId]?youtubeId=[youtubeId]

Or watch on YouTube: https://youtu.be/[youtubeId]
```

## Audio Metadata Updates

Added `naatId` field to `AudioMetadata` interface:
```typescript
export interface AudioMetadata {
  audioUrl: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  isLocalFile: boolean;
  audioId?: string;
  youtubeId?: string;
  naatId?: string; // NEW: For deep linking
}
```

## Testing Deep Links

### iOS Simulator
```bash
xcrun simctl openurl booted "ubaidraza://naat/test123?youtubeId=abc"
```

### Android Emulator
```bash
adb shell am start -W -a android.intent.action.VIEW -d "ubaidraza://naat/test123?youtubeId=abc"
```

### Physical Device
1. Send the deep link via messaging app
2. Tap the link
3. App should open and play the naat

## Fallback Behavior

If deep link fails:
1. User sees YouTube link in shared message
2. Can manually open YouTube
3. Error logged to Sentry for debugging

## Future Enhancements

### Universal Links (iOS)
- Set up apple-app-site-association file
- Use web domain for universal links
- Format: `https://ubaidraza.app/naat/[id]`

### App Links (Android)
- Set up assetlinks.json file
- Use web domain for app links
- Same format as universal links

### Web Redirect Page
Create a web page that:
1. Detects if app is installed
2. Attempts to open deep link
3. Falls back to YouTube if app not installed
4. Provides app store links

## Error Handling

All deep link errors are:
- Logged to console for debugging
- Sent to Sentry for monitoring
- Shown to user via toast notifications

## Security Considerations

- Deep links are validated before processing
- Only `ubaidraza://` scheme is accepted
- Invalid URLs are rejected silently
- No sensitive data in deep links (only IDs)
