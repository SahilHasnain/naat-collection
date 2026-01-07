# Implementation Plan

- [ ] 1. Set up audio extraction Appwrite function infrastructure
  - Create function directory structure at `functions/extract-audio/`
  - Create `package.json` with yt-dlp dependency configuration
  - Set up Appwrite function configuration file
  - _Requirements: 2.1, 4.3_

- [ ] 2. Implement audio URL extraction service
  - [ ] 2.1 Create main function handler with request validation
    - Write function entry point in `functions/extract-audio/src/main.js`
    - Implement YouTube ID validation (11 chars, alphanumeric + underscore/hyphen)
    - Parse and validate request body
    - _Requirements: 4.4, 2.1_

  - [ ] 2.2 Implement yt-dlp wrapper for audio extraction
    - Write yt-dlp command execution logic using child_process
    - Use flags: `--get-url -f bestaudio` to extract best audio stream
    - Implement 10-second timeout for extraction
    - Parse yt-dlp output to extract audio URL and metadata
    - _Requirements: 2.1, 4.1_

  - [ ] 2.3 Implement in-memory URL caching with TTL
    - Create Map-based cache structure for storing audio URLs
    - Implement cache key generation from YouTube ID
    - Add cache expiration logic (5-hour TTL)
    - Write cache hit/miss logic in request handler
    - _Requirements: 2.2, 2.3_

  - [ ] 2.4 Add comprehensive error handling
    - Handle yt-dlp not found error
    - Handle invalid YouTube ID errors
    - Handle extraction timeout errors
    - Handle network/YouTube API errors
    - Return structured error responses with error codes
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 3. Extend Appwrite service for audio URL retrieval
  - [ ] 3.1 Add audio extraction function configuration
    - Add `AUDIO_EXTRACTION_FUNCTION_ID` to environment variables
    - Update `services/appwrite.ts` with function ID constant
    - _Requirements: 2.1_

  - [ ] 3.2 Implement getAudioUrl method
    - Write `getAudioUrl(youtubeId: string)` method in appwrite service
    - Call Appwrite function execution API
    - Parse and return audio URL response
    - Handle function execution errors
    - _Requirements: 2.1, 2.4_

- [ ] 4. Create AudioPlayer component
  - [ ] 4.1 Build AudioPlayer component structure
    - Create `components/AudioPlayer.tsx` file
    - Define component props interface (audioUrl, title, channelName, thumbnailUrl, callbacks)
    - Set up component state for playback (position, duration, isPlaying, isLoading)
    - _Requirements: 1.5, 5.1_

  - [ ] 4.2 Implement audio playback using expo-av
    - Initialize Audio.Sound instance from expo-av
    - Load audio from URL
    - Implement play/pause functionality
    - Implement seek functionality
    - Track playback position and duration
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 4.3 Build audio player UI
    - Create album art/thumbnail display
    - Add play/pause button
    - Create seek bar with current time and duration labels
    - Add volume control slider
    - Style components to match app design
    - _Requirements: 1.5, 5.1, 5.3_

  - [ ] 4.4 Handle playback completion and errors
    - Detect when audio finishes playing
    - Show completion state with replay option
    - Handle audio loading errors
    - Emit error events to parent component
    - _Requirements: 5.4, 3.1_

- [ ] 5. Enhance player screen with mode switching
  - [ ] 5.1 Add playback mode state management
    - Add mode state ('video' | 'audio') to player screen
    - Add audioUrl state for storing extracted URL
    - Add loading and error states for audio extraction
    - _Requirements: 1.1, 1.2_

  - [ ] 5.2 Implement mode toggle UI
    - Create toggle button/switch for video/audio modes
    - Position toggle in player header
    - Style toggle to be visible and accessible
    - Add icons for video and audio modes
    - _Requirements: 1.1_

  - [ ] 5.3 Implement mode switching logic
    - Write `switchMode` function to handle mode changes
    - When switching to audio: fetch audio URL, stop video, start audio
    - When switching to video: stop audio, start video
    - Preserve playback position when switching modes
    - Show loading indicator during audio URL extraction
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ] 5.4 Integrate AudioPlayer component
    - Conditionally render VideoPlayer or AudioPlayer based on mode
    - Pass naat data to AudioPlayer component
    - Handle audio playback errors from AudioPlayer
    - Update UI based on active mode
    - _Requirements: 1.5, 3.1_

- [ ] 6. Implement playback mode preference persistence
  - [ ] 6.1 Create preference storage utilities
    - Write `savePlaybackMode` function using AsyncStorage
    - Write `loadPlaybackMode` function using AsyncStorage
    - Define storage key constant: `@naat_playback_mode`
    - _Requirements: 6.1, 6.4_

  - [ ] 6.2 Load and apply saved preference on mount
    - Load saved playback mode when player screen mounts
    - Apply saved mode as initial state
    - Default to video mode if no preference exists
    - _Requirements: 6.2, 6.3_

  - [ ] 6.3 Save preference when mode changes
    - Call `savePlaybackMode` whenever user switches modes
    - Update storage immediately on mode change
    - _Requirements: 6.4_

- [ ] 7. Implement audio URL refresh on expiration
  - [ ] 7.1 Add URL expiration detection
    - Monitor audio playback errors in AudioPlayer
    - Detect HTTP 403/404 errors indicating expired URL
    - Emit expiration event to parent component
    - _Requirements: 3.1_

  - [ ] 7.2 Implement automatic URL refresh
    - Write `refreshAudioUrl` function in player screen
    - Request fresh audio URL from extraction service
    - Resume playback from last known position
    - Show loading indicator during refresh
    - _Requirements: 3.2, 3.3, 3.4_

  - [ ] 7.3 Handle refresh failures
    - Detect if refresh fails after retry
    - Show error message to user
    - Provide option to switch to video mode
    - _Requirements: 3.1, 4.1_

- [ ] 8. Deploy and configure audio extraction function
  - Deploy function to Appwrite
  - Configure environment variables
  - Set up function permissions
  - Test function with sample YouTube IDs
  - _Requirements: 2.1, 4.3_

- [ ] 9. End-to-end testing and validation
  - Test complete audio playback flow on iOS device
  - Test complete audio playback flow on Android device
  - Verify mode switching works smoothly
  - Test URL expiration and refresh flow
  - Verify preference persistence across app restarts
  - Test error scenarios (invalid ID, network errors)
  - _Requirements: All_
