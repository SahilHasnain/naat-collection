# Implementation Plan

- [x] 1. Set up project configuration and dependencies
  - Install required packages: Appwrite SDK, AsyncStorage, React Native video player (expo-av)
  - Create environment configuration file for Appwrite credentials
  - Set up TypeScript types directory structure
  - _Requirements: 8.1, 8.3_

- [x] 2. Create core data models and type definitions
  - Define TypeScript interfaces for Naat, Reciter, and API response types
  - Create error handling types (AppError, ErrorCode enum)
  - Define hook return types and service interfaces
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 3. Implement Appwrite service layer
  - Create AppwriteService class with client initialization
  - Implement getNaats method with pagination support
  - Implement getNaatById method for single naat retrieval
  - Implement searchNaats method with query filtering
  - Add error handling with timeout mechanisms (10 seconds max)
  - _Requirements: 1.1, 4.1, 5.2, 8.1, 8.4_

- [x] 4. Implement local storage service
  - Create StorageService class using AsyncStorage
  - Implement savePlaybackPosition method
  - Implement getPlaybackPosition method
  - Implement clearPlaybackPosition method
  - Implement getRecentPositions method with 10-item limit
  - Add error handling for storage failures
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Create custom hooks for data management

- [x] 5.1 Implement useNaats hook
  - Create state management for naats list, loading, and error states
  - Implement pagination logic with 20 items per page
  - Implement loadMore function for infinite scroll
  - Implement refresh function with pull-to-refresh support
  - Add in-memory caching for API responses
  - _Requirements: 1.1, 1.3, 8.1, 8.5_

- [x] 5.2 Implement useSearch hook
  - Create state management for search query and results
  - Implement debounced search with 300ms delay
  - Implement setQuery function with real-time filtering
  - Implement clearSearch function to restore full list
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 5.3 Implement usePlaybackPosition hook
  - Create hook that accepts naatId parameter
  - Load saved position on mount
  - Implement savePosition function
  - Implement clearPosition function
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 6. Build reusable UI components

- [x] 6.1 Create NaatCard component
  - Implement component with thumbnail, title, duration, and metadata display
  - Format duration in MM:SS format
  - Add placeholder image for failed thumbnail loads
  - Optimize with React.memo for list performance
  - Apply NativeWind styling for minimalist design
  - _Requirements: 1.1, 1.2, 1.4, 3.1, 3.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6.2 Create SearchBar component
  - Implement text input with debouncing
  - Add clear button functionality
  - Apply accessible keyboard handling
  - Style with high contrast for readability
  - _Requirements: 3.5, 5.1, 5.3_

- [x] 6.3 Create EmptyState component
  - Implement message display with optional icon
  - Add optional action button
  - Create variants for "no content" and "no search results"
  - _Requirements: 1.5, 5.4_

- [x] 6.4 Create VideoPlayer component
  - Integrate expo-av for video playback
  - Implement play, pause, and seek controls
  - Add fullscreen toggle functionality
  - Implement position change callback for saving progress
  - Implement onComplete callback for clearing saved position
  - Add error handling with user-friendly messages
  - Display loading state during video initialization
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.2_

- [x] 6.5 Create ErrorBoundary component
  - Implement React error boundary
  - Display user-friendly error messages
  - Add retry mechanism
  - _Requirements: 8.1, 8.2_

- [x] 7. Implement HomeScreen (app/index.tsx)
  - Integrate useNaats hook for data fetching
  - Integrate useSearch hook for search functionality
  - Implement FlatList with NaatCard components
  - Add SearchBar at the top of the screen
  - Implement infinite scroll with loadMore
  - Add pull-to-refresh functionality
  - Display loading states during data fetch
  - Display EmptyState when no naats available
  - Handle navigation to player screen on naat selection
  - Implement error display with retry button
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1_

- [x] 8. Implement PlayerScreen (app/player/[id].tsx)
  - Extract naatId from route parameters
  - Fetch naat details using AppwriteService
  - Integrate usePlaybackPosition hook
  - Display resume playback prompt if saved position exists
  - Integrate VideoPlayer component with video URL
  - Implement position tracking and auto-save
  - Clear saved position when video completes
  - Handle back navigation
  - Display error state if video fails to load
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.4, 8.2_

- [x] 9. Implement global error handling and retry logic
  - Create utility functions for network retry with exponential backoff (max 3 attempts)
  - Implement timeout wrapper for all API calls
  - Add error logging for debugging
  - Implement fallback to cached data when API unavailable
  - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [x] 10. Apply performance optimizations
  - Configure FlatList with getItemLayout for consistent heights
  - Implement keyExtractor for stable list keys
  - Enable removeClippedSubviews for large lists
  - Configure expo-image for optimized caching
  - Verify debouncing on search input
  - _Requirements: 1.3_

- [x] 11. Implement Appwrite backend setup documentation
  - Document Appwrite project creation steps
  - Document database and Naats collection schema
  - Document collection permissions configuration
  - Document index creation for search functionality
  - Create example environment variables file
  - _Requirements: 4.2, 4.3, 4.5_

- [x] 12. Create video ingestion function (Appwrite Function)
  - Set up Appwrite Function project structure
  - Implement YouTube channel video fetching logic
  - Extract video metadata (title, URL, thumbnail, duration, youtubeId)
  - Implement duplicate checking using youtubeId
  - Insert new videos into Naats collection
  - Implement error logging for failed ingestions
  - Configure cron trigger for scheduled execution
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 13. Integrate error boundary into app root
  - Wrap app root with ErrorBoundary component
  - Configure error reporting
  - Test error recovery flows
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 14. Polish UI with consistent styling
  - Apply NativeWind classes for minimalist design
  - Ensure consistent spacing and typography
  - Verify high contrast ratios for text
  - Test dark mode support
  - Optimize visual hierarchy
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 15. Create integration tests for critical flows
  - Write tests for home screen data loading and display
  - Write tests for search functionality end-to-end
  - Write tests for video playback with position saving
  - Write tests for error handling scenarios
  - _Requirements: 1.1, 2.1, 5.2, 6.1, 8.1_
