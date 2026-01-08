# Implementation Plan

- [x] 1. Create core utilities and data management layer
  - [x] 1.1 Create `utils/formatters.ts` with utility functions
    - Implement `formatFileSize(bytes: number): string` to convert bytes to MB/GB
    - Implement `formatDownloadDate(timestamp: number): string` for relative dates
    - Implement `filterDownloadsByQuery(downloads, query)` for search filtering
    - Implement `sortDownloads(downloads, sortBy, sortOrder)` for sorting
    - _Requirements: 1.3, 4.3, 5.1, 5.2_

  - [x] 1.2 Create `hooks/useDownloads.ts` custom hook
    - Implement state management for downloads, loading, and error states
    - Implement `loadDownloads()` using `audioDownloadService.getAllDownloads()`
    - Implement `calculateTotalSize()` using `audioDownloadService.getTotalDownloadSize()`
    - Implement `deleteAudio(audioId)` with error handling
    - Implement `refresh()` that validates file existence
    - Implement `clearAll()` for bulk deletion
    - Export `UseDownloadsReturn` interface
    - _Requirements: 1.2, 3.3, 4.2, 6.2, 6.3_

  - [x] 1.3 Update type definitions in `types/index.ts`
    - Export DownloadedAudioCardProps interface
    - Export DownloadedAudioModalProps interface
    - Export DownloadsHeaderProps interface
    - Export UseDownloadsReturn interface
    - Export SortOption type
    - _Requirements: All_

- [x] 2. Build UI components for downloads display
  - [x] 2.1 Create `components/DownloadedAudioCard.tsx`
    - Define `DownloadedAudioCardProps` interface
    - Implement card layout with thumbnail, title, channel name
    - Display formatted download date and file size
    - Add delete button with icon
    - Implement press handler for playback
    - Add press feedback animation and accessibility labels
    - Style matching existing NaatCard design
    - _Requirements: 1.3, 3.1, 4.4_

  - [x] 2.2 Create `components/DownloadsHeader.tsx`
    - Define `DownloadsHeaderProps` interface
    - Display total storage used with formatted size
    - Display count of downloaded files
    - Add optional "Clear All" button
    - Style with app theme
    - _Requirements: 4.1, 4.3_

  - [x] 2.3 Create `components/DownloadedAudioModal.tsx`
    - Define `DownloadedAudioModalProps` interface
    - Implement Modal wrapper with full-screen presentation
    - Add close button in header
    - Integrate AudioPlayer component with local file URI
    - Pass `isLocalFile={true}` to AudioPlayer
    - Handle modal lifecycle and error handling
    - Add loading state while audio initializes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Implement Downloads screen with core functionality
  - [x] 3.1 Create `app/downloads.tsx` screen route
    - Implement screen component using useDownloads hook
    - Add state for selectedAudio, modalVisible, searchQuery, sortBy, sortOrder
    - Implement SafeAreaView layout with header
    - Add DownloadsHeader component
    - Add empty state component when no downloads exist
    - _Requirements: 1.1, 1.4, 1.5, 8.1_

  - [x] 3.2 Implement FlatList with downloads display
    - Render FlatList with DownloadedAudioCard items
    - Implement getItemLayout for performance optimization
    - Add windowSize and maxToRenderPerBatch settings
    - Add memoization to DownloadedAudioCard
    - Implement pull-to-refresh functionality
    - _Requirements: 1.1, 6.1, 6.5_

  - [x] 3.3 Add search and sort functionality
    - Add search bar for filtering downloads
    - Implement search input handler with debouncing (300ms)
    - Filter downloads using `filterDownloadsByQuery` utility
    - Add sort controls (date/title, asc/desc)
    - Apply sorting using `sortDownloads` utility
    - Preserve sort order when searching
    - Update UI to show active sort option
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.4 Implement playback modal integration
    - Add DownloadedAudioModal to screen
    - Implement audio selection handler
    - Handle modal open/close lifecycle
    - Pass download metadata to modal
    - _Requirements: 2.1, 2.5_

- [x] 4. Add delete functionality and navigation
  - [x] 4.1 Implement delete with confirmation
    - Add delete handler in downloads screen
    - Show confirmation dialog before deletion
    - Call `deleteAudio` from useDownloads hook
    - Update UI immediately on successful deletion
    - Show error message on deletion failure
    - Add loading indicator during delete operation
    - Update storage stats after deletion
    - Implement haptic feedback for delete action
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.5, 8.2_

  - [x] 4.2 Add navigation to downloads screen
    - Update app navigation structure to include downloads route
    - Add tab bar or navigation item for downloads
    - Implement navigation between home and downloads screens
    - Add active state indicator for current screen
    - Ensure navigation uses expo-router
    - Test navigation flow and state persistence
    - _Requirements: 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 5. Polish UI/UX and handle edge cases
  - [x] 5.1 Implement loading and error states
    - Add loading spinner during initial data fetch
    - Add skeleton loading for download cards
    - Add error messages for failed operations
    - Add retry buttons for recoverable errors
    - Implement toast notifications for user feedback
    - Add success confirmation messages
    - _Requirements: 6.5, 8.1, 8.2, 8.3, 8.4_

  - [x] 5.2 Add accessibility features
    - Add VoiceOver/TalkBack labels to all interactive elements
    - Ensure minimum touch target sizes (44x44)
    - Verify color contrast ratios
    - Add screen reader announcements for state changes
    - Test with accessibility tools
    - _Requirements: 8.5_

  - [ ] 5.3 Add animations and styling polish
    - Add modal slide animations
    - Add card press feedback animations
    - Add delete fade out animation
    - Ensure consistent styling with app theme
    - Cache formatted values for performance
    - _Requirements: 8.5_

  - [ ] 5.4 Handle edge cases and error scenarios
    - Handle empty downloads list gracefully
    - Handle missing thumbnail images (use default)
    - Handle very long titles and channel names (truncate)
    - Handle externally deleted files (cleanup metadata)
    - Handle corrupted audio files (show error, offer delete)
    - Handle storage permission errors
    - Test with various file sizes and counts (100+ items)

    - _Requirements: 1.4, 6.3, 6.4, 8.4_

  - [ ] 5.5 Integration and end-to-end testing
    - Test complete flow: navigate → view → play → delete
    - Test search and sort combinations
    - Test refresh functionality
    - Test modal open/close lifecycle
    - Test with no downloads, single download, many downloads
    - Test error scenarios and recovery
    - Verify storage stats update correctly
    - _Requirements: All_
