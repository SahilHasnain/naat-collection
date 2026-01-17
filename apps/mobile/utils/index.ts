/**
 * Utility functions index
 * Exports all utility functions for easy importing
 */

// Re-export shared utilities
export {
  formatDownloadDate,
  formatDuration,
  formatFileSize,
  formatRelativeTime,
  formatViews,
} from "@naat-collection/shared";

// Mobile-specific utilities
export {
  DEFAULT_TIMEOUT,
  MAX_RETRY_ATTEMPTS,
  fallbackCache,
  formatErrorMessage,
  logError,
  withCacheFallback,
  withRetry,
  withTimeout,
  withTimeoutAndRetry,
  wrapError,
  type RetryOptions,
  type TimeoutOptions,
} from "./errorHandling";

export {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showToast,
  showWarningToast,
  type ToastType,
} from "./toast";

export { filterDownloadsByQuery, sortDownloads } from "./formatters";
