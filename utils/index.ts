/**
 * Utility functions index
 * Exports all utility functions for easy importing
 */

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

export { formatRelativeTime } from "./dateUtils";

export { formatViews } from "./numberUtils";

export {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showToast,
  showWarningToast,
  type ToastType,
} from "./toast";

export {
  filterDownloadsByQuery,
  formatDownloadDate,
  formatFileSize,
  sortDownloads,
} from "./formatters";
