/**
 * Live Radio Hook
 *
 * Hook for managing live radio state and playback
 */

import { appwriteService } from "@/services/appwrite";
import { liveRadioService } from "@/services/liveRadio";
import { LiveRadioMetadata, LiveRadioState } from "@/types/live-radio";
import { Naat } from "@naat-collection/shared";
import { useCallback, useEffect, useState } from "react";

export function useLiveRadio() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [liveState, setLiveState] = useState<LiveRadioState | null>(null);
  const [currentNaat, setCurrentNaat] = useState<Naat | null>(null);
  const [upcomingNaats, setUpcomingNaats] = useState<Naat[]>([]);
  const [listenerCount, setListenerCount] = useState<number>(0);

  /**
   * Load the current live radio state
   */
  const loadLiveState = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current state
      const state = await liveRadioService.getCurrentState();

      if (!state) {
        throw new Error("Live radio is not available");
      }

      setLiveState(state);

      // Get current track ID
      const currentTrackId = liveRadioService.getCurrentTrackId(state);
      if (!currentTrackId) {
        throw new Error("No current track in playlist");
      }

      // Get current naat details
      const naat = await liveRadioService.getCurrentNaat(currentTrackId);

      if (!naat) {
        throw new Error("Current naat not found");
      }

      setCurrentNaat(naat);

      // Get upcoming naats
      const upcoming = await liveRadioService.getUpcomingNaats(state, 5);
      setUpcomingNaats(upcoming);

      // Get listener count
      const count = await liveRadioService.getListenerCount();
      setListenerCount(count);

      setIsLoading(false);
    } catch (err) {
      console.error("[useLiveRadio] Error loading state:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, []);

  /**
   * Get metadata for audio player
   */
  const getLiveMetadata =
    useCallback(async (): Promise<LiveRadioMetadata | null> => {
      if (!currentNaat) return null;

      // Get audio URL from Appwrite service
      const audioResponse = await appwriteService.getAudioUrl(
        currentNaat.audioId,
      );

      if (!audioResponse.success || !audioResponse.audioUrl) {
        console.error("[useLiveRadio] Failed to get audio URL");
        return null;
      }

      return {
        isLive: true,
        currentNaat: {
          id: currentNaat.$id,
          title: currentNaat.title,
          channelName: currentNaat.channelName,
          thumbnailUrl: currentNaat.thumbnailUrl,
          duration: currentNaat.duration,
          audioUrl: audioResponse.audioUrl,
          youtubeId: currentNaat.youtubeId,
        },
        listenerCount,
      };
    }, [currentNaat, listenerCount]);

  /**
   * Refresh the live state
   */
  const refresh = useCallback(async () => {
    await loadLiveState();
  }, [loadLiveState]);

  /**
   * Initialize and subscribe to updates
   */
  useEffect(() => {
    // Initial load
    loadLiveState();

    // Subscribe to changes (polling-based)
    const unsubscribe = liveRadioService.subscribeToChanges((newState) => {
      console.log("[useLiveRadio] Track changed, reloading...");
      loadLiveState();
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [loadLiveState]);

  return {
    isLoading,
    error,
    currentNaat,
    upcomingNaats,
    listenerCount,
    liveState,
    getLiveMetadata,
    refresh,
  };
}
