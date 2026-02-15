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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSetupRef = useRef(false);

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

  // Listen to playback state changes - only when live radio is active
  useTrackPlayerEvents([Event.PlaybackState], async (event) => {
    if (!isLiveRadioActive) return;

    if (event.type === Event.PlaybackState) {
      const state = event.state;
      setIsPlaying(state === State.Playing);
      setIsLoading(state === State.Buffering || state === State.Loading);
    }
  });

  // Listen to track end events - only when live radio is active
  useTrackPlayerEvents([Event.PlaybackQueueEnded], async () => {
    if (!isLiveRadioActive) {
      console.log(
        "[LiveRadio] Track finished but live radio not active, ignoring",
      );
      return;
    }
    console.log("[LiveRadio] Track finished, checking for next track...");
    checkAndAdvanceTrack();
  });

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
   * Load and play current track
   */
  const loadAndPlayCurrentTrack = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { naat } = await loadLiveState();

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
        artist: naat.channelName,
        artwork: naat.thumbnailUrl,
      });

      // Update notification capabilities for live mode (no seek) AFTER adding track
      await updateNotificationCapabilities(true);

      // Play
      await TrackPlayer.play();

      setIsPlaying(true);
      setIsLoading(false);

      console.log("[LiveRadio] Now playing:", naat.title);
    } catch (err) {
      console.error("[LiveRadio] Error loading track:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [loadLiveState, setMode]);

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

    try {
      const state = await liveRadioService.getCurrentState();
      if (!state) return;

      // If server has advanced to next track, load it
      if (state.currentTrackIndex !== currentTrackIndexRef.current) {
        console.log(
          `[LiveRadio] Server advanced from ${currentTrackIndexRef.current} to ${state.currentTrackIndex}`,
        );
        await loadAndPlayCurrentTrack();
      } else {
        // Server hasn't advanced yet, advance locally
        console.log("[LiveRadio] Advancing to next track locally...");

        // Calculate next track index
        const nextIndex =
          (currentTrackIndexRef.current + 1) % state.playlist.length;
        currentTrackIndexRef.current = nextIndex;

        // Update local state
        setLiveState({ ...state, currentTrackIndex: nextIndex });

        // Load and play next track
        await loadAndPlayCurrentTrack();
      }
    } catch (err) {
      console.error("[LiveRadio] Error checking track advancement:", err);
    }
  }, [loadAndPlayCurrentTrack, isLiveRadioActive]);

  /**
   * Poll for track changes every 30 seconds
   */
  useEffect(() => {
    if (!isPlaying) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const state = await liveRadioService.getCurrentState();
        if (state && state.currentTrackIndex !== currentTrackIndexRef.current) {
          console.log("[LiveRadio] Track changed via polling");
          await loadAndPlayCurrentTrack();
        }
      } catch (err) {
        console.error("[LiveRadio] Error polling for changes:", err);
      }
    }, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isPlaying, loadAndPlayCurrentTrack]);

  /**
   * Play live radio
   */
  const play = useCallback(async () => {
    const state = await TrackPlayer.getState();
    if (state === State.Paused || state === State.Ready) {
      // Resume existing track
      await TrackPlayer.play();
    } else {
      // Load and play current track
      await loadAndPlayCurrentTrack();
    }
  }, [loadAndPlayCurrentTrack]);

  /**
   * Pause live radio
   */
  const pause = useCallback(async () => {
    await TrackPlayer.pause();
  }, []);

  /**
   * Stop live radio
   */
  const stop = useCallback(async () => {
    try {
      await TrackPlayer.reset();
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
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
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
