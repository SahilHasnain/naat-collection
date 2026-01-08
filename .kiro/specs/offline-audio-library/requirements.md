# Requirements Document

## Introduction

This feature adds a dedicated offline audio library page to the Naat app, allowing users to view, manage, and play all their downloaded audio files without requiring an internet connection. The library will provide a centralized location for accessing downloaded content with full playback capabilities using the existing AudioPlayer component.

## Glossary

- **Offline Audio Library**: A dedicated screen that displays all audio files downloaded to the device
- **Download System**: The existing audioDownloadService that manages local audio file storage
- **Audio Player**: The existing AudioPlayer component used for audio playback
- **Download Metadata**: Information stored about each downloaded audio including title, channel, file size, and download date
- **Navigation System**: The expo-router based navigation structure of the app
- **Local Storage**: Device file system where audio files are stored offline

## Requirements

### Requirement 1

**User Story:** As a user, I want to access a dedicated page showing all my downloaded audio files, so that I can easily find and play my offline content.

#### Acceptance Criteria

1. WHEN THE User navigates to the downloads section, THE Offline Audio Library SHALL display a list of all downloaded audio files
2. THE Offline Audio Library SHALL retrieve download metadata from the Download System using the getAllDownloads method
3. THE Offline Audio Library SHALL display each downloaded audio with its title, channel name, download date, and file size
4. WHEN no downloaded files exist, THE Offline Audio Library SHALL display an empty state message with guidance to download content
5. THE Offline Audio Library SHALL be accessible through the Navigation System as a separate route

### Requirement 2

**User Story:** As a user, I want to play downloaded audio files directly from the library, so that I can listen to content without switching screens or requiring internet.

#### Acceptance Criteria

1. WHEN THE User selects a downloaded audio item, THE Offline Audio Library SHALL open a playback modal with the Audio Player component
2. THE Offline Audio Library SHALL pass the local file path to the Audio Player using the isLocalFile flag set to true
3. THE Audio Player SHALL load and play the audio file from Local Storage without network requests
4. THE Offline Audio Library SHALL provide the audio metadata (title, channel name, thumbnail) to the Audio Player
5. WHEN playback is complete or cancelled, THE Offline Audio Library SHALL close the modal and return to the library list

### Requirement 3

**User Story:** As a user, I want to delete individual downloaded files from the library, so that I can manage my device storage.

#### Acceptance Criteria

1. THE Offline Audio Library SHALL display a delete action for each downloaded audio item
2. WHEN THE User initiates deletion, THE Offline Audio Library SHALL prompt for confirmation before proceeding
3. WHEN deletion is confirmed, THE Offline Audio Library SHALL call the Download System deleteAudio method
4. THE Offline Audio Library SHALL remove the deleted item from the displayed list immediately
5. WHEN deletion fails, THE Offline Audio Library SHALL display an error message and retain the item in the list

### Requirement 4

**User Story:** As a user, I want to see storage information for my downloads, so that I can understand how much space my offline content is using.

#### Acceptance Criteria

1. THE Offline Audio Library SHALL display the total storage size of all downloaded files
2. THE Offline Audio Library SHALL calculate total size using the Download System getTotalDownloadSize method
3. THE Offline Audio Library SHALL format file sizes in human-readable units (MB, GB)
4. THE Offline Audio Library SHALL display individual file sizes for each downloaded audio
5. THE Offline Audio Library SHALL update storage information when files are added or deleted

### Requirement 5

**User Story:** As a user, I want to sort and filter my downloaded audio files, so that I can quickly find specific content.

#### Acceptance Criteria

1. THE Offline Audio Library SHALL provide sorting options for downloaded files by date (newest/oldest) and title (A-Z)
2. WHEN THE User changes sort order, THE Offline Audio Library SHALL reorder the displayed list accordingly
3. THE Offline Audio Library SHALL provide a search function to filter downloads by title or channel name
4. WHEN THE User enters search text, THE Offline Audio Library SHALL display only matching downloaded files
5. THE Offline Audio Library SHALL preserve the current sort order when applying search filters

### Requirement 6

**User Story:** As a user, I want to refresh the downloads list, so that I can ensure the library reflects the current state of my device storage.

#### Acceptance Criteria

1. THE Offline Audio Library SHALL provide a pull-to-refresh gesture
2. WHEN THE User performs pull-to-refresh, THE Offline Audio Library SHALL reload all download metadata from the Download System
3. THE Offline Audio Library SHALL verify that local files still exist during refresh
4. WHEN a file is missing from Local Storage, THE Offline Audio Library SHALL remove its metadata and update the display
5. THE Offline Audio Library SHALL display a loading indicator during the refresh operation

### Requirement 7

**User Story:** As a user, I want to navigate between the main library and downloads page easily, so that I can switch between online and offline content.

#### Acceptance Criteria

1. THE Navigation System SHALL include a tab or navigation item for the Offline Audio Library
2. THE Offline Audio Library SHALL be accessible from the main navigation structure
3. THE Navigation System SHALL indicate the current active screen (home or downloads)
4. THE Offline Audio Library SHALL maintain its state when navigating away and returning
5. THE Navigation System SHALL use expo-router for routing between screens

### Requirement 8

**User Story:** As a user, I want visual feedback when interacting with the downloads library, so that I understand the app's state and my actions.

#### Acceptance Criteria

1. THE Offline Audio Library SHALL display loading indicators when fetching download data
2. THE Offline Audio Library SHALL display progress indicators during delete operations
3. THE Offline Audio Library SHALL provide visual confirmation when actions complete successfully
4. THE Offline Audio Library SHALL display error messages with clear descriptions when operations fail
5. THE Offline Audio Library SHALL use consistent styling with the existing app theme and design system
