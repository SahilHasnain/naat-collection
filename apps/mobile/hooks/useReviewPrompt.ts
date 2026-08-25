import { reviewPromptService } from "@/services/reviewPrompt";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

/**
 * Module-level trigger so screens like home.tsx can request a review check
 * (e.g. on Android back-press) without prop-drilling through _layout.
 */
let _registeredCheck: (() => void) | null = null;

export function triggerReviewCheck() {
  _registeredCheck?.();
}

/**
 * Handles the in-app review prompt lifecycle.
 *
 * - Records app opens (distinct active days) on foreground.
 * - Shows the review modal when the user presses back to exit
 *   (registered via module-level trigger).
 */
export function useReviewPrompt() {
  const [visible, setVisible] = useState(false);
  const checkInProgressRef = useRef(false);

  const checkAndMaybeShow = useCallback(async () => {
    if (checkInProgressRef.current) return;
    checkInProgressRef.current = true;
    try {
      await reviewPromptService.recordAppOpen();
      const shouldShow = await reviewPromptService.shouldShowReview();
      if (shouldShow) {
        await reviewPromptService.markShown();
        setVisible(true);
      }
    } catch {
      // Never let review tracking break the app
    } finally {
      checkInProgressRef.current = false;
    }
  }, []);

  useEffect(() => {
    _registeredCheck = checkAndMaybeShow;
    return () => {
      _registeredCheck = null;
    };
  }, [checkAndMaybeShow]);

  const close = useCallback(() => setVisible(false), []);

  const handleRate = useCallback(() => {
    setVisible(false);
    void reviewPromptService.markRated();
  }, []);

  const handleSnooze = useCallback(() => {
    setVisible(false);
    void reviewPromptService.snooze();
  }, []);

  const handleNever = useCallback(() => {
    setVisible(false);
    void reviewPromptService.dismissForever();
  }, []);

  /** Dev-only: reset eligibility and show the prompt immediately. */
  const forceShowForTest = useCallback(async () => {
    await reviewPromptService.debugForceEligible();
    await reviewPromptService.markShown();
    setVisible(true);
  }, []);

  return {
    visible,
    onClose: close,
    onRate: handleRate,
    onSnooze: handleSnooze,
    onNever: handleNever,
    forceShowForTest,
    checkAndMaybeShow,
  };
}
