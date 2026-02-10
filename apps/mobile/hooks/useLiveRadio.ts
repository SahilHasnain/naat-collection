/**
 * Live Radio Hook
 *
 * Hook for managing live radio state and playback
 */

import { liveRadioService } from "@/services/liveRadio";
import { LiveRadioMetadata, LiveRadioState } from "@/types/live-radio";
import { Naat } from "@naat-collection/shared";
import { useCallback, useEffect, useRef, useState } from "react";

export function useLiveRadio() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [liveState, setLiveState] = useState<LiveRadioState | null>(null);
  const [currentNaat, setCurrentNaat] = useState<Naat | null>(null);
  const [upcomingNaats, setUpcomingNaats] = useState<Naat[]>([]);
  const [listenerCount, setListenerCount] = useState<number>(0);
  const [startPosition, setStartPosition] = useState<number>(0);

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

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
   * Check if current naat has ended and reload if needed
   */
  const checkForTrackChange = useCallback(async () => {
    if (!liveState || !currentNaat) return;

    const position = liveRadioService.calculatePlaybackPosition(
      liveState.startedAt,
      currentNaat.duration * 1000,
    );

    // If we've exceeded the duration, the track should have changed
    if (position >= currentNaat.duration * 1000) {
      console.log("[useLiveRadio] Track should have changed, reloading...");
      await loadLiveState();
    }
  }, [liveState, currentNaat, loadLiveState]);

  /**
   * Subscribe to realtime updates
   */
  useEffect(() => {
    // Initial load
    loadLiveState();

    // Subscribe to changes
    unsubscribeRef.current = liveRadioService.subscribeToChanges((newState) => {
      console.log("[useLiveRadio] State updated via realtime");
      setLiveState(newState);
      loadLiveState(); // Reload everything when state changes
    });

    // Check for track changes every 10 seconds
    checkIntervalRef.current = setInterval(checkForTrackChange, 10000);

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [loadLiveState, checkForTrackChange]);

  /**
   * Get metadata for audio player
   */
  const getLiveMetadata = useCallback((): LiveRadioMetadata | null => {
    if (!currentNaat) return null;

    return {
      isLive: true,
      currentNaat: {
        id: currentNaat.$id,
        title: currentNaat.title,
        channelName: currentNaat.channelName,
        thumbnailUrl: currentNaat.thumbnailUrl,
        duration: currentNaat.duration,
        audioUrl: currentNaat.audioUrl,
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
