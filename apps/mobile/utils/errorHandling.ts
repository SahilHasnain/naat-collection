/**
 * Error Handling Utilities
 *
 * Provides retry logic with exponential backoff, timeout wrappers,
 * error logging, and cache fallback mechanisms for robust error handling.
 */

import { AppError, ErrorCode } from "../types";

/**
 * Default timeout for API requests (10 seconds as per requirements)
 */
export const DEFAULT_TIMEOUT = 10000;

/**
 * Maximum number of retry attempts
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Initial delay for exponential backoff (in milliseconds)
 */
const INITIAL_BACKOFF_DELAY = 1000;

/**
 * Backoff multiplier for exponential backoff
 */
const BACKOFF_MULTIPLIER = 2;

/**
 * Options for retry configuration
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  multiplier?: number;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Options for timeout wrapper
 */
export interface TimeoutOptions {
  timeoutMs?: number;
  timeoutMessage?: string;
}

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Simple in-memory cache for fallback data
 */
class FallbackCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxAge: number = 5 * 60 * 1000; // 5 minutes default

  /**
   * Set a cache entry
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get a cache entry if it exists and is not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Clear a specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Set the maximum age for cache entries
   */
  setMaxAge(ms: number): void {
    this.maxAge = ms;
  }
}

/**
 * Global fallback cache instance
 */
export const fallbackCache = new FallbackCache();

/**
 * Calculates the delay for exponential backoff
 */
function calculateBackoffDelay(
  attempt: number,
  initialDelay: number,
  multiplier: number
): number {
  return initialDelay * Math.pow(multiplier, attempt - 1);
}

/**
 * Delays execution for the specified duration
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: Error): boolean {
  if (error instanceof AppError) {
    // Only retry recoverable errors
    if (!error.recoverable) {
      return false;
    }

    // Retry network errors and some API errors
    return (
      error.code === ErrorCode.NETWORK_ERROR ||
      error.code === ErrorCode.API_ERROR
    );
  }

  // Retry unknown errors by default
  return true;
}

/**
 * Wraps a promise with a timeout mechanism
 *
 * @param promise - The promise to wrap
 * @param options - Timeout configuration options
 * @returns Promise that rejects if timeout is exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions = {}
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT,
    timeoutMessage = "Request timed out. Please check your connection and try again.",
  } = options;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AppError(timeoutMessage, ErrorCode.NETWORK_ERROR, true));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Executes a function with retry logic and exponential backoff
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws Error if all retry attempts fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = MAX_RETRY_ATTEMPTS,
    initialDelay = INITIAL_BACKOFF_DELAY,
    multiplier = BACKOFF_MULTIPLIER,
    shouldRetry = isRetryableError,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }

      // Log retry attempt
      logError(lastError, {
        context: "Retry attempt",
        attempt,
        maxAttempts,
      });

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retrying with exponential backoff
      const delayMs = calculateBackoffDelay(attempt, initialDelay, multiplier);
      await delay(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Combines timeout and retry logic for robust API calls
 *
 * @param fn - The async function to execute
 * @param retryOptions - Retry configuration options
 * @param timeoutOptions - Timeout configuration options
 * @returns Promise resolving to the function result
 */
export async function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  retryOptions: RetryOptions = {},
  timeoutOptions: TimeoutOptions = {}
): Promise<T> {
  return withRetry(() => withTimeout(fn(), timeoutOptions), retryOptions);
}

/**
 * Executes a function with cache fallback on failure
 *
 * @param fn - The async function to execute
 * @param cacheKey - Key for caching the result
 * @param options - Combined retry and timeout options
 * @returns Promise resolving to the function result or cached data
 */
export async function withCacheFallback<T>(
  fn: () => Promise<T>,
  cacheKey: string,
  options: RetryOptions & TimeoutOptions = {}
): Promise<T> {
  try {
    // Try to execute the function with retry and timeout
    const result = await withTimeoutAndRetry(fn, options, options);

    // Cache the successful result
    fallbackCache.set(cacheKey, result);

    return result;
  } catch (error) {
    // Try to get cached data as fallback
    const cachedData = fallbackCache.get<T>(cacheKey);

    if (cachedData !== null) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        context: "Using cached fallback data",
        cacheKey,
      });

      return cachedData;
    }

    // No cached data available, throw the error
    throw error;
  }
}

/**
 * Error logging utility for debugging
 *
 * @param error - The error to log
 * @param context - Additional context information
 */
export function logError(
  error: Error,
  context?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error instanceof AppError && {
      code: error.code,
      recoverable: error.recoverable,
    }),
    ...context,
  };

  // Log to console in development
  if (__DEV__) {
    console.error("[Error]", errorInfo);
  }

  // In production, you could send to a logging service
  // Example: sendToLoggingService(errorInfo);
}

/**
 * Creates a user-friendly error message from an error object
 *
 * @param error - The error to format
 * @returns User-friendly error message
 */
export function formatErrorMessage(error: Error): string {
  if (error instanceof AppError) {
    return error.message;
  }

  // Default messages for common error types
  if (error.message.includes("network") || error.message.includes("fetch")) {
    return "Unable to connect. Please check your internet connection.";
  }

  if (error.message.includes("timeout")) {
    return "Request timed out. Please try again.";
  }

  return "Something went wrong. Please try again.";
}

/**
 * Wraps an error in an AppError if it isn't already
 *
 * @param error - The error to wrap
 * @param defaultCode - Default error code to use
 * @returns AppError instance
 */
export function wrapError(
  error: unknown,
  defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(formatErrorMessage(error), defaultCode, true);
  }

  return new AppError("An unexpected error occurred.", defaultCode, true);
}
