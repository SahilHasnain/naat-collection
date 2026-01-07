# Requirements Document

## Introduction

This document defines the requirements for implementing audio-only playback functionality in the Naat platform. The feature enables users to listen to naats as audio streams without video, reducing bandwidth usage and providing a better experience for users who prefer audio-only content. The system will extract audio stream URLs from YouTube videos on-demand using yt-dlp and deliver them to the mobile application for playback.

## Glossary

- **Naat Platform**: The mobile application that displays and plays Islamic devotional content
- **Audio Extraction Service**: An Appwrite serverless function that extracts audio stream URLs from YouTube videos
- **Player Component**: The React Native component responsible for media playback
- **yt-dlp**: An open-source command-line tool for extracting media information and stream URLs from YouTube
- **Stream URL**: A direct HTTP URL to an audio stream that can be played by media players
- **Audio Mode**: The playback mode where only audio is streamed without video
- **Video Mode**: The default playback mode where both video and audio are streamed

## Requirements

### Requirement 1

**User Story:** As a user, I want to switch between video and audio playback modes, so that I can save bandwidth and battery when I only want to listen.

#### Acceptance Criteria

1. WHEN the user opens the player screen, THE Player Component SHALL display a toggle control for switching between video mode and audio mode
2. WHEN the user selects audio mode, THE Player Component SHALL request an audio stream URL from the Audio Extraction Service
3. WHEN the user switches from video mode to audio mode, THE Player Component SHALL stop video playback and start audio playback at the current position
4. WHEN the user switches from audio mode to video mode, THE Player Component SHALL stop audio playback and start video playback at the current position
5. WHERE the user has selected audio mode, THE Player Component SHALL display audio-specific UI elements including waveform visualization or album art

### Requirement 2

**User Story:** As a user, I want audio playback to start quickly without delays, so that I have a smooth listening experience.

#### Acceptance Criteria

1. WHEN the Audio Extraction Service receives a request with a valid YouTube ID, THE Audio Extraction Service SHALL return an audio stream URL within 2 seconds
2. WHEN the Audio Extraction Service extracts an audio stream URL, THE Audio Extraction Service SHALL cache the URL for 5 hours to avoid redundant extractions
3. IF the cached audio stream URL is older than 5 hours, THEN THE Audio Extraction Service SHALL extract a fresh audio stream URL
4. WHEN the Player Component receives an audio stream URL, THE Player Component SHALL begin playback within 1 second

### Requirement 3

**User Story:** As a user, I want audio playback to continue working even if the stream URL expires, so that my listening experience is not interrupted.

#### Acceptance Criteria

1. WHEN an audio stream URL expires during playback, THE Player Component SHALL detect the playback failure
2. IF playback fails due to an expired URL, THEN THE Player Component SHALL request a fresh audio stream URL from the Audio Extraction Service
3. WHEN a fresh audio stream URL is received, THE Player Component SHALL resume playback from the last known position
4. WHILE refreshing the audio stream URL, THE Player Component SHALL display a loading indicator to inform the user

### Requirement 4

**User Story:** As a developer, I want the Audio Extraction Service to handle errors gracefully, so that the application remains stable when YouTube changes or issues occur.

#### Acceptance Criteria

1. IF the Audio Extraction Service cannot extract an audio stream URL, THEN THE Audio Extraction Service SHALL return an error response with a descriptive message
2. WHEN the Audio Extraction Service encounters a YouTube API error, THE Audio Extraction Service SHALL log the error details for debugging
3. IF yt-dlp is not installed or fails to execute, THEN THE Audio Extraction Service SHALL return an error indicating the service is unavailable
4. WHEN the Audio Extraction Service receives an invalid YouTube ID, THE Audio Extraction Service SHALL return a validation error within 500 milliseconds

### Requirement 5

**User Story:** As a user, I want audio playback controls to work the same as video controls, so that I have a consistent experience across both modes.

#### Acceptance Criteria

1. WHEN audio mode is active, THE Player Component SHALL provide play, pause, seek, and volume controls
2. WHEN the user seeks to a different position during audio playback, THE Player Component SHALL update the playback position within 500 milliseconds
3. WHILE audio is playing, THE Player Component SHALL display the current playback time and total duration
4. WHEN the audio playback completes, THE Player Component SHALL display completion state and allow replay

### Requirement 6

**User Story:** As a user, I want my playback mode preference to be remembered, so that I don't have to switch modes every time I open a naat.

#### Acceptance Criteria

1. WHEN the user selects a playback mode, THE Player Component SHALL store the preference in local storage
2. WHEN the user opens a new naat, THE Player Component SHALL load the stored playback mode preference
3. WHERE the user has no stored preference, THE Player Component SHALL default to video mode
4. WHEN the user changes the playback mode, THE Player Component SHALL update the stored preference immediately
