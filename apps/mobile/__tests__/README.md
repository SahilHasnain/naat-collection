# Integration Tests

This directory contains integration tests for the Naat Platform application.

## Test Structure

- `integration/HomeScreen.test.tsx` - Tests for home screen data loading and display
- `integration/Search.test.tsx` - Tests for search functionality end-to-end
- `integration/VideoPlayback.test.tsx` - Tests for video playback with position saving
- `integration/ErrorHandling.test.tsx` - Tests for error handling scenarios

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Test Coverage

The integration tests cover:

1. **Home Screen Data Loading** (Requirement 1.1)
   - Loading and displaying naats on mount
   - Empty state when no naats available
   - Error state when API fails

2. **Search Functionality** (Requirement 5.2)
   - Performing search with debouncing
   - Displaying filtered results
   - Empty state for no results

3. **Video Playback with Position Saving** (Requirements 2.1, 6.1)
   - Loading naat and displaying video player
   - Resume prompt when saved position exists
   - Error handling for failed loads

4. **Error Handling** (Requirement 8.1)
   - Network error messages
   - Retry mechanisms
   - Search error handling

## Test Configuration

- **Framework**: Jest with jest-expo preset
- **Testing Library**: @testing-library/react-native
- **Mocks**: Appwrite service, AsyncStorage, expo-router, expo-av

## Notes

- Tests use mocked services to avoid external dependencies
- Timeouts are set to 10 seconds for async operations
- Tests focus on core functional logic only
