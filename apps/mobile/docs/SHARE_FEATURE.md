# Share Naat Feature

## Overview
The share functionality allows users to share naats with others via native sharing options (WhatsApp, SMS, Email, etc.).

## Implementation

### Share Service (`services/shareService.ts`)
Core service that handles sharing logic using React Native's native `Share` API.

**Functions:**
- `shareNaat(naat, options)` - Share a specific naat with customizable options
- `shareCurrentAudio(title, channelName, youtubeId)` - Share currently playing audio

**Features:**
- Includes naat title, channel name, and YouTube URL
- Platform-specific handling (iOS vs Android)
- Error tracking with Sentry
- Toast notifications for user feedback

### Integration Points

#### 1. Full Player Modal
- Location: `components/FullPlayerModal.tsx`
- Access: Options menu (three dots icon) → "Share" button
- Shares currently playing audio with title, channel, and YouTube link

#### 2. Mini Player
- Location: `components/MiniPlayer.tsx`
- Access: Share icon button (between play/pause and close)
- Quick share for currently playing audio

#### 3. Home Screen Action Sheet
- Location: `app/home.tsx`
- Access: Long-press any naat card → "Share" button
- Shares selected naat from the list

## User Experience

### Share Flow
1. User taps share button/option
2. Native share sheet appears with available apps
3. User selects sharing method (WhatsApp, SMS, etc.)
4. Success toast notification appears

### Shared Content Format
```
🎵 [Naat Title]

By: [Channel Name]

https://youtu.be/[youtubeId]
```

## Technical Details

### Dependencies
- React Native `Share` API (built-in)
- `@sentry/react-native` for error tracking
- Custom toast utilities for user feedback

### Platform Support
- iOS: URL handled separately in share options
- Android: URL included in message text
- Both platforms support all native sharing options

### Error Handling
- Graceful fallback if share fails
- Error logging to Sentry
- User-friendly error messages via toast

## Future Enhancements
- Share with custom message templates
- Share audio file directly (if downloaded)
- Share to specific platforms directly
- Share statistics tracking
