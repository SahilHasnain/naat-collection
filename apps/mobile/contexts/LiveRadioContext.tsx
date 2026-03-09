import { usePlaybackMode } from "@/contexts/PlaybackModeContext";
import { appwriteService } from "@/services/appwrite";
import { liveRadioService } from "@/services/liveRadio";
import {
    setupPlayer,
    updateNotificationCapabilities,
} from "@/services/trackPlayerService";
import { LiveRadioState } from "@/types/live-radio";
import { Naat } from "@naat-collection/shared";
import TrackPlayer, {
    Event,
    State,
    useTrackPlayerEvents,
} from "@weights-ai/react-native-track-player";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

interface LiveRadioContextType {
  // State
  isPlaying: boolean;
  isLoading: boolean;
  currentNaat: Naat | null;
  upcomingNaats: Naat[];
  listenerCount: number;
  error: Error | null;

  // Actions
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  refresh: () => Promise<void>;
}

const LiveRadioContext = createContext<LiveRadioContextType | undefined>(
  undefined,
);

export const LiveRadioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { mode, setMode, isLiveRadioActive, isNormalAudioActive } =
    usePlaybackMode();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentNaat, setCurrentNaat] = useState<Naat | null>(null);
  const [upcomingNaats, setUpcomingNaats] = useState<Naat[]>([]);
  const [listenerCount, setListenerCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [liveState, setLiveState] = useState<LiveRadioState | null>(null);

  const currentTrackIndexRef = useRef<number>(-1);
  const realtimeUnsubscribeRef = useRef<(() => void) | null>(null);
  const isSetupRef = useRef(false);
  const isAdvancingRef = useRef(false); // Mutex to prevent concurrent track advances

  // Setup Track Player on mount
  useEffect(() => {
    const initPlayer = async () => {
      if (isSetupRef.current) return;

      try {
        await setupPlayer();
        isSetupRef.current = true;
        console.log("[LiveRadio] Track Player initialized");
      } catch (err) {
        console.error("[LiveRadio] Error initializing Track Player:", err);
      }
    };

    initPlayer();
  }, []);

  // Stop live radio when normal audio becomes active
  useEffect(() => {
    if (isNormalAudioActive && isPlaying) {
      console.log("[LiveRadio] Normal audio active, pausing live radio");
      setIsPlaying(false);
      // Don't clear currentNaat - keep the UI visible
    }
  }, [isNormalAudioActive, isPlaying]);

  // Listen to playback state changes and track end - only when live radio is active
  useTrackPlayerEvents(
    [Event.PlaybackState, Event.PlaybackQueueEnded],
    async (event) => {
      if (!isLiveRadioActive) return;

      if (event.type === Event.PlaybackState) {
        const state = event.state;

        // Intercept pause from notification — treat it as stop for live radio
        if (state === State.Paused) {
          console.log("[LiveRadio] Pause detected, treating as stop");
          await TrackPlayer.reset();
          setIsPlaying(false);
          await liveRadioService.stopHeartbeat();
          return;
        }

        setIsPlaying(state === State.Playing);
        setIsLoading(state === State.Buffering || state === State.Loading);

        // When player is reset (e.g. from notification stop), stop heartbeat
        if (state === State.None) {
          await liveRadioService.stopHeartbeat();
        }
      } else if (event.type === Event.PlaybackQueueEnded) {
        // Track ended - automatically advance to next
        console.log("[LiveRadio] Track ended, auto-advancing to next...");
        await checkAndAdvanceTrack();
      }
    },
  );

  /**
   * Load current live state from server
   */
  const loadLiveState = useCallback(async () => {
    try {
      const state = await liveRadioService.getCurrentState();
      if (!state) {
        throw new Error("Live radio is not available");
      }

      setLiveState(state);
      currentTrackIndexRef.current = state.currentTrackIndex;

      // Get current track
      const currentTrackId = liveRadioService.getCurrentTrackId(state);
      if (!currentTrackId) {
        throw new Error("No current track in playlist");
      }

      const naat = await liveRadioService.getCurrentNaat(currentTrackId);
      if (!naat) {
        throw new Error("Current naat not found");
      }

      setCurrentNaat(naat);

      // Get upcoming tracks
      const upcoming = await liveRadioService.getUpcomingNaats(state, 5);
      setUpcomingNaats(upcoming);

      // Get listener count
      const count = await liveRadioService.getListenerCount();
      setListenerCount(count);

      return { state, naat };
    } catch (err) {
      console.error("[LiveRadio] Error loading state:", err);
      throw err;
    }
  }, []);

  /**
   * Calculate elapsed time since track started on backend
   */
  const calculateElapsedTime = useCallback(
    (state: LiveRadioState, trackDuration: number) => {
      const trackStartTime = new Date(state.updatedAt).getTime();
      const now = Date.now();
      const elapsedMs = now - trackStartTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      const shouldAdvance = elapsedSeconds >= trackDuration;
      const remainingSeconds = Math.max(0, trackDuration - elapsedSeconds);

      console.log(
        `[LiveRadio] Track started at ${state.updatedAt}, elapsed: ${elapsedSeconds}s / ${trackDuration}s`,
      );

      return {
        elapsedSeconds: Math.min(elapsedSeconds, trackDuration), // Cap at track duration
        shouldAdvance,
        remainingSeconds,
      };
    },
    [],
  );

  /**
   * Load and play current track
   */
  const loadAndPlayCurrentTrack = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { state, naat } = await loadLiveState();

      // Calculate elapsed time to sync with backend
      const timing = calculateElapsedTime(state, naat.duration);

      // If track should have already finished, advance to next
      if (timing.shouldAdvance) {
        console.log(
          "[LiveRadio] Track already finished on backend, advancing...",
        );
        setIsLoading(false);
        await checkAndAdvanceTrack();
        return;
      }

      // Switch to live radio mode
      setMode("live");

      // Get audio URL
      const audioResponse = await appwriteService.getAudioUrl(naat.audioId);
      if (!audioResponse.success || !audioResponse.audioUrl) {
        throw new Error("Failed to get audio URL");
      }

      // Reset queue and add new track
      await TrackPlayer.reset();
      await TrackPlayer.add({
        url: audioResponse.audioUrl,
        title: naat.title,
        artwork: naat.thumbnailUrl,
      });

      // Update notification capabilities for live mode (no seek) AFTER adding track
      await updateNotificationCapabilities(true);

      // Seek to correct position to sync with backend
      if (timing.elapsedSeconds > 0) {
        console.log(
          `[LiveRadio] Seeking to ${timing.elapsedSeconds}s to sync with backend`,
        );
        await TrackPlayer.seekTo(timing.elapsedSeconds);
      }

      // Play
      await TrackPlayer.play();

      // Start heartbeat to track active listening
      liveRadioService.startHeartbeat();

      setIsPlaying(true);
      setIsLoading(false);

      console.log(
        `[LiveRadio] Now playing: ${naat.title} (${timing.remainingSeconds}s remaining)`,
      );
    } catch (err) {
      console.error("[LiveRadio] Error loading track:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [loadLiveState, setMode, calculateElapsedTime]);

  /**
   * Check if server has advanced to next track, or advance locally
   * Only advances if live radio is currently active
   */
  const checkAndAdvanceTrack = useCallback(async () => {
    // Only advance if live radio is currently active
    if (!isLiveRadioActive) {
      console.log("[LiveRadio] Not advancing - live radio is not active");
      return;
    }

    // Prevent concurrent execution (mutex)
    if (isAdvancingRef.current) {
      console.log("[LiveRadio] Already advancing track, skipping...");
      return;
    }

    try {
      isAdvancingRef.current = true;
      setIsLoading(true);
      const state = await liveRadioService.getCurrentState();
      if (!state) {
        setIsLoading(false);
        return;
      }

      // If server has advanced to next track, check if we need to sync
      if (state.currentTrackIndex !== currentTrackIndexRef.current) {
        console.log(
          `[LiveRadio] Server at index ${state.currentTrackIndex}, client at ${currentTrackIndexRef.current}`,
        );

        // Check if server is just one track ahead (normal progression)
        const expectedNextIndex =
          (currentTrackIndexRef.current + 1) % state.playlist.length;
        if (state.currentTrackIndex === expectedNextIndex) {
          console.log(
            "[LiveRadio] Server one track ahead, this is normal - staying with current track",
          );
          // Don't sync - we'll naturally advance when our track finishes
          setIsLoading(false);
          return;
        }

        // Check if we're significantly out of sync (more than 1 track difference)
        const trackDifference = Math.abs(
          state.currentTrackIndex - currentTrackIndexRef.current,
        );
        const isSignificantDrift =
          trackDifference > 1 && trackDifference < state.playlist.length - 1;

        if (!isSignificantDrift) {
          console.log(
            "[LiveRadio] Minor drift or playlist wrap, staying with current track",
          );
          setIsLoading(false);
          return;
        }

        // Significant drift detected - resync with server
        console.log(
          "[LiveRadio] Significant drift detected, resyncing with server...",
        );
        currentTrackIndexRef.current = state.currentTrackIndex;
        setLiveState(state);

        // Get the new track
        const currentTrackId = liveRadioService.getCurrentTrackId(state);
        if (!currentTrackId) {
          throw new Error("No current track in playlist");
        }

        const naat = await liveRadioService.getCurrentNaat(currentTrackId);
        if (!naat) {
          throw new Error("Current naat not found");
        }

        setCurrentNaat(naat);

        // Get upcoming tracks
        const upcoming = await liveRadioService.getUpcomingNaats(state, 5);
        setUpcomingNaats(upcoming);

        // Calculate elapsed time to sync with backend
        const timing = calculateElapsedTime(state, naat.duration);

        // If track should have already finished, this might be a race condition
        // where we got the new track index but old updatedAt timestamp
        // In this case, just start from beginning
        if (timing.shouldAdvance) {
          console.log(
            "[LiveRadio] Timing mismatch detected (race condition), starting from beginning",
          );
          timing.elapsedSeconds = 0;
          timing.shouldAdvance = false;
          timing.remainingSeconds = naat.duration;
        }

        // Get audio URL and play
        const audioResponse = await appwriteService.getAudioUrl(naat.audioId);
        if (!audioResponse.success || !audioResponse.audioUrl) {
          throw new Error("Failed to get audio URL");
        }

        await TrackPlayer.reset();
        await TrackPlayer.add({
          url: audioResponse.audioUrl,
          title: naat.title,
          artwork: naat.thumbnailUrl,
        });

        await updateNotificationCapabilities(true);

        // Seek to correct position to sync with backend
        if (timing.elapsedSeconds > 0) {
          console.log(
            `[LiveRadio] Seeking to ${timing.elapsedSeconds}s to sync with backend`,
          );
          await TrackPlayer.seekTo(timing.elapsedSeconds);
        }

        await TrackPlayer.play();

        console.log(
          `[LiveRadio] Now playing: ${naat.title} (${timing.remainingSeconds}s remaining)`,
        );
        setIsLoading(false);
      } else {
        // Server hasn't advanced yet, check if current track should have finished
        const currentTrackId = liveRadioService.getCurrentTrackId(state);
        if (!currentTrackId) {
          throw new Error("No current track in playlist");
        }

        const naat = await liveRadioService.getCurrentNaat(currentTrackId);
        if (!naat) {
          throw new Error("Current naat not found");
        }

        const timing = calculateElapsedTime(state, naat.duration);

        if (timing.shouldAdvance) {
          // Track finished but server hasn't updated yet, advance locally
          console.log(
            "[LiveRadio] Track finished locally, advancing to next...",
          );

          // Calculate next track index
          const nextIndex =
            (currentTrackIndexRef.current + 1) % state.playlist.length;

          // Update our local reference BEFORE making any changes
          // This prevents the polling from detecting a mismatch
          currentTrackIndexRef.current = nextIndex;

          const updatedState = { ...state, currentTrackIndex: nextIndex };
          setLiveState(updatedState);

          // Get the next track
          const nextTrackId = state.playlist[nextIndex];
          if (!nextTrackId) {
            throw new Error("Next track not found in playlist");
          }

          const nextNaat = await liveRadioService.getCurrentNaat(nextTrackId);
          if (!nextNaat) {
            throw new Error("Next naat not found");
          }

          setCurrentNaat(nextNaat);

          // Get upcoming tracks
          const upcoming = await liveRadioService.getUpcomingNaats(
            updatedState,
            5,
          );
          setUpcomingNaats(upcoming);

          // Get audio URL and play
          const audioResponse = await appwriteService.getAudioUrl(
            nextNaat.audioId,
          );
          if (!audioResponse.success || !audioResponse.audioUrl) {
            throw new Error("Failed to get audio URL");
          }

          await TrackPlayer.reset();
          await TrackPlayer.add({
            url: audioResponse.audioUrl,
            title: nextNaat.title,
            artwork: nextNaat.thumbnailUrl,
          });

          await updateNotificationCapabilities(true);
          await TrackPlayer.play();

          console.log(
            "[LiveRadio] Now playing (local advance):",
            nextNaat.title,
          );
          setIsLoading(false);
        } else {
          // Track still playing, no action needed
          console.log(
            `[LiveRadio] Track still playing (${timing.remainingSeconds}s remaining)`,
          );
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error("[LiveRadio] Error checking track advancement:", err);
      setError(err as Error);
      setIsLoading(false);
    } finally {
      isAdvancingRef.current = false; // Release mutex
    }
  }, [isLiveRadioActive, calculateElapsedTime]);

  /**
   * Subscribe to realtime updates when playing
   * Instantly sync when server advances tracks
   */
  useEffect(() => {
    if (!isPlaying || !liveState) return;

    console.log("[LiveRadio] Setting up realtime subscription");

    const unsubscribe = liveRadioService.subscribeToChanges(
      async (updatedState) => {
        // Check if server has advanced to a different track
        if (updatedState.currentTrackIndex !== currentTrackIndexRef.current) {
          console.log(
            `[LiveRadio] Realtime: Server at index ${updatedState.currentTrackIndex}, client at ${currentTrackIndexRef.current}`,
          );

          // Check if we're significantly out of sync (more than 1 track difference)
          const trackDifference = Math.abs(
            updatedState.currentTrackIndex - currentTrackIndexRef.current,
          );
          const isSignificantDrift =
            trackDifference > 1 &&
            trackDifference < updatedState.playlist.length - 1;

          if (isSignificantDrift) {
            console.log(
              "[LiveRadio] Significant drift detected via realtime, resyncing...",
            );
            await checkAndAdvanceTrack();
          } else {
            console.log(
              "[LiveRadio] Minor drift, will naturally sync on track end",
            );
          }
        }
      },
    );

    realtimeUnsubscribeRef.current = unsubscribe;

    return () => {
      console.log("[LiveRadio] Cleaning up realtime subscription");
      if (realtimeUnsubscribeRef.current) {
        realtimeUnsubscribeRef.current();
        realtimeUnsubscribeRef.current = null;
      }
    };
  }, [isPlaying, liveState, checkAndAdvanceTrack]);

  /**
   * Refresh listener count every 30 seconds when playing
   */
  useEffect(() => {
    if (!isPlaying) return;

    const refreshListenerCount = async () => {
      const count = await liveRadioService.getListenerCount();
      setListenerCount(count);
    };

    // Refresh immediately
    refreshListenerCount();

    // Then refresh every 30 seconds
    const interval = setInterval(
      refreshListenerCount,
      30000,
    ) as unknown as NodeJS.Timeout;

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying]);

  /**
   * Play live radio - always loads fresh from backend to stay in sync
   */
  const play = useCallback(async () => {
    await loadAndPlayCurrentTrack();
  }, [loadAndPlayCurrentTrack]);

  /**
   * Stop live radio playback (keeps UI visible so user can resume fresh)
   */
  const pause = useCallback(async () => {
    try {
      await TrackPlayer.reset();
    } catch (err) {
      console.error("[LiveRadio] Error resetting player:", err);
    }
    setIsPlaying(false);
    await liveRadioService.stopHeartbeat();
  }, []);

  /**
   * Stop live radio
   */
  const stop = useCallback(async () => {
    try {
      await TrackPlayer.reset();
      // Stop heartbeat when stopping
      await liveRadioService.stopHeartbeat();
    } catch (err) {
      console.error("[LiveRadio] Error stopping:", err);
    }
    setIsPlaying(false);
    setCurrentNaat(null);
    setMode("none");
  }, [setMode]);

  /**
   * Refresh live state
   */
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      await loadLiveState();
      setIsLoading(false);
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, [loadLiveState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      TrackPlayer.reset();
      liveRadioService.stopHeartbeat();
      if (realtimeUnsubscribeRef.current) {
        realtimeUnsubscribeRef.current();
      }
    };
  }, []);

  const value: LiveRadioContextType = {
    isPlaying,
    isLoading,
    currentNaat,
    upcomingNaats,
    listenerCount,
    error,
    play,
    pause,
    stop,
    refresh,
  };

  return (
    <LiveRadioContext.Provider value={value}>
      {children}
    </LiveRadioContext.Provider>
  );
};

export const useLiveRadioPlayer = () => {
  const context = useContext(LiveRadioContext);
  if (context === undefined) {
    throw new Error("useLiveRadioPlayer must be used within LiveRadioProvider");
  }
  return context;
};
