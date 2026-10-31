import type { QueueAction } from "@/contexts/AudioContext";
import { showErrorToast, showInfoToast, showSuccessToast } from "./toast";

export type QueueIntent = "next" | "queue";

/**
 * Single place that turns a queue mutation result into user-visible feedback,
 * so every entry point (card menu, history, queue sheet) behaves the same.
 */
export function showQueueFeedback(
  action: QueueAction,
  intent: QueueIntent,
): void {
  switch (action) {
    case "started":
      showSuccessToast("Playing now");
      break;
    case "queued":
      showSuccessToast(intent === "next" ? "Will play next" : "Added to queue");
      break;
    case "moved":
      showSuccessToast("Moved to play next");
      break;
    case "already-current":
      showInfoToast("Already playing");
      break;
    case "already-queued":
      showInfoToast("Already in the queue");
      break;
    case "full":
      showInfoToast("Queue is full (50 tracks)");
      break;
    case "failed":
      showErrorToast("Couldn't add to the queue");
      break;
  }
}
