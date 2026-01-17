import { useCallback, useEffect, useState } from "react";
import { storageService } from "../services/storage";
import type { UsePlaybackPositionReturn } from "../types";

/**
 * Custom hook for managing playback position for a specific naat
 *
 * Features:
 * - Loads saved position on mount
 * - Saves position to local storage
 * - Clears position when video completes
 * - Error handling for storage operations
 *
 * @param naatId - Unique identifier for the naat
 * @returns UsePlaybackPositionReturn object with position state and control functions
 */
export function usePlaybackPosition(naatId: string): UsePlaybackPositionReturn {
  const [savedPosition, setSavedPosition] = useState<number | null>(null);

  /**
   * Load saved position on mount
   */
  useEffect(() => {
    if (!naatId) {
      return;
    }

    let isMounted = true;

    const loadPosition = async () => {
      try {
        const position = await storageService.getPlaybackPosition(naatId);

        if (isMounted) {
          setSavedPosition(position);
        }
      } catch (error) {
        console.error("Failed to load playback position:", error);

        // Set to null on error so UI doesn't show stale data
        if (isMounted) {
          setSavedPosition(null);
        }
      }
    };

    loadPosition();

    return () => {
      isMounted = false;
    };
  }, [naatId]);

  /**
   * Save playback position to storage
   * @param position - Playback position in seconds
   */
  const savePosition = useCallback(
    (position: number) => {
      if (!naatId || position < 0) {
        return;
      }

      // Update local state immediately for better UX
      setSavedPosition(position);

      // Save to storage asynchronously
      storageService.savePlaybackPosition(naatId, position).catch((error) => {
        console.error("Failed to save playback position:", error);
      });
    },
    [naatId]
  );

  /**
   * Clear saved playback position
   * Called when video completes or user wants to reset
   */
  const clearPosition = useCallback(() => {
    if (!naatId) {
      return;
    }

    // Update local state immediately
    setSavedPosition(null);

    // Clear from storage asynchronously
    storageService.clearPlaybackPosition(naatId).catch((error) => {
      console.error("Failed to clear playback position:", error);
    });
  }, [naatId]);

  return {
    savedPosition,
    savePosition,
    clearPosition,
  };
}
