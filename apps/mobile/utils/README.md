# Error Handling Utilities

This module provides comprehensive error handling utilities for the Naat Platform, including retry logic with exponential backoff, timeout wrappers, error logging, and cache fallback mechanisms.

## Features

- **Retry Logic**: Automatically retry failed operations with exponential backoff (max 3 attempts)
- **Timeout Wrapper**: Enforce timeout limits on all API calls (default 10 seconds)
- **Error Logging**: Structured error logging for debugging
- **Cache Fallback**: Automatically fall back to cached data when API is unavailable
- **Error Wrapping**: Convert any error to user-friendly AppError instances

## Usage

### Basic Retry with Exponential Backoff

```typescript
import { withRetry } from "../utils/errorHandling";

const result = await withRetry(() => fetchDataFromAPI(), {
  maxAttempts: 3,
  initialDelay: 1000,
  multiplier: 2,
});
```

### Timeout Wrapper

```typescript
import { withTimeout } from "../utils/errorHandling";

const result = await withTimeout(fetchDataFromAPI(), { timeoutMs: 10000 });
```

### Combined Timeout and Retry

```typescript
import { withTimeoutAndRetry } from "../utils/errorHandling";

const result = await withTimeoutAndRetry(
  () => fetchDataFromAPI(),
  { maxAttempts: 3 },
  { timeoutMs: 10000 }
);
```

### Cache Fallback

```typescript
import { withCacheFallback } from "../utils/errorHandling";

const result = await withCacheFallback(() => fetchDataFromAPI(), "cache-key", {
  maxAttempts: 3,
  timeoutMs: 10000,
});
```

### Error Logging

```typescript
import { logError } from "../utils/errorHandling";

try {
  await someOperation();
} catch (error) {
  logError(error, {
    context: "someOperation",
    userId: "123",
  });
}
```

### Error Wrapping

```typescript
import { wrapError, ErrorCode } from "../utils/errorHandling";

try {
  await someOperation();
} catch (error) {
  throw wrapError(error, ErrorCode.NETWORK_ERROR);
}
```

## Configuration

### Default Values

- `DEFAULT_TIMEOUT`: 10000ms (10 seconds)
- `MAX_RETRY_ATTEMPTS`: 3
- `INITIAL_BACKOFF_DELAY`: 1000ms (1 second)
- `BACKOFF_MULTIPLIER`: 2

### Cache Management

The fallback cache stores successful API responses for 5 minutes by default:

```typescript
import { fallbackCache } from "../utils/errorHandling";

// Set custom max age
fallbackCache.setMaxAge(10 * 60 * 1000); // 10 minutes

// Clear specific cache entry
fallbackCache.clear("cache-key");

// Clear all cache
fallbackCache.clearAll();
```

## Integration

The error handling utilities are integrated into:

- **AppwriteService**: All API calls use `withCacheFallback` for retry, timeout, and cache fallback
- **StorageService**: All storage operations use `logError` and `wrapError` for consistent error handling

## Error Types

All errors are wrapped in `AppError` instances with:

- `message`: User-friendly error message
- `code`: Error code from `ErrorCode` enum
- `recoverable`: Boolean indicating if the error is recoverable

### Error Codes

- `NETWORK_ERROR`: Network connectivity issues
- `API_ERROR`: API request failures
- `PLAYBACK_ERROR`: Video playback failures
- `STORAGE_ERROR`: Local storage failures
- `UNKNOWN_ERROR`: Unexpected errors

## Requirements Satisfied

This implementation satisfies the following requirements:

- **8.1**: Error handling with user-friendly messages and retry options
- **8.3**: Error logging for debugging
- **8.4**: Timeout mechanisms for all network requests (10 seconds max)
- **8.5**: Fallback to cached data when API unavailable
