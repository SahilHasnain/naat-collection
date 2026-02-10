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
  const [startPosition, setStartPosition] = useState<number>(0);

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

      // Get current naat details
      const naat = await liveRadioService.getCurrentNaat(state.currentNaatId);

      if (!naat) {
        throw new Error("Current naat not found");
      }

      setCurrentNaat(naat);

      // Calculate where in the naat we should start playing
      const position = liveRadioService.calculatePlaybackPosition(
        state.startedAt,
        naat.duration * 1000, // Convert seconds to milliseconds
      );

      setStartPosition(position);

      // Get upcoming naats
      const playlist = await liveRadioService.getPlaylist(state.playlist);
      setUpcomingNaats(playlist);

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
        startPosition,
        listenerCount,
      };
    }, [currentNaat, startPosition, listenerCount]);

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

    // Subscribe to realtime changes
    const unsubscribe = liveRadioService.subscribeToChanges((newState) => {
      // Only reload if the track actually changed
      setLiveState((prevState) => {
        if (prevState?.currentNaatId !== newState.currentNaatId) {
          console.log("[useLiveRadio] Track changed, reloading...");
          loadLiveState();
        }
        return newState;
      });
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
    startPosition,
    getLiveMetadata,
    refresh,
  };
}
