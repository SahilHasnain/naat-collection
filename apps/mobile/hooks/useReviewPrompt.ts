import { reviewPromptService } from "@/services/reviewPrompt";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

/**
 * Handles the in-app review prompt lifecycle.
 *
 * - Records app opens (distinct active days) on launch and foreground.
 * - Shows the review modal once the user has returned on a day after
 *   becoming eligible (i.e. after using the app on 3 separate days).
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
    void checkAndMaybeShow();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void checkAndMaybeShow();
      }
    });

    return () => subscription.remove();
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
  };
}
