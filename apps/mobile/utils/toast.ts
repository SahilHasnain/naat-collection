/**
 * Toast notification utility for user feedback
 */

import { Alert, Platform, ToastAndroid } from "react-native";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: "short" | "long";
}

/**
 * Show a toast notification
 * Uses native ToastAndroid on Android and Alert on iOS
 */
export function showToast({
  message,
  type = "info",
  duration = "short",
}: ToastOptions) {
  if (Platform.OS === "android") {
    const toastDuration =
      duration === "long" ? ToastAndroid.LONG : ToastAndroid.SHORT;
    ToastAndroid.show(message, toastDuration);
  } else {
    // iOS doesn't have native toast, use Alert as fallback
    Alert.alert(getToastTitle(type), message);
  }
}

/**
 * Show a success toast
 */
export function showSuccessToast(
  message: string,
  duration: "short" | "long" = "short"
) {
  showToast({ message, type: "success", duration });
}

/**
 * Show an error toast
 */
export function showErrorToast(
  message: string,
  duration: "short" | "long" = "short"
) {
  showToast({ message, type: "error", duration });
}

/**
 * Show an info toast
 */
export function showInfoToast(
  message: string,
  duration: "short" | "long" = "short"
) {
  showToast({ message, type: "info", duration });
}

/**
 * Show a warning toast
 */
export function showWarningToast(
  message: string,
  duration: "short" | "long" = "short"
) {
  showToast({ message, type: "warning", duration });
}

/**
 * Get toast title based on type
 */
function getToastTitle(type: ToastType): string {
  switch (type) {
    case "success":
      return "✓ Success";
    case "error":
      return "✗ Error";
    case "warning":
      return "⚠ Warning";
    case "info":
    default:
      return "ℹ Info";
  }
}
