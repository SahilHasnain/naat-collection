/**
 * Live Radio Context
 *
 * Separate context for live radio playback
 * Handles automatic track advancement and server sync
 */

import { appwriteService } from "@/services/appwrite";
import { liveRadioService } from "@/services/liveRadio";
import { LiveRadioState } from "@/types/live-radio";
import { Naat } from "@naat-collection/shared";
import { Audio, AVPlaybackStatus } from "expo-av";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentNaat, setCurrentNaat] = useState<Naat | null>(null);
  const [upcomingNaats, setUpcomingNaats] = useState<Naat[]>([]);
  const [listenerCount, setListenerCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [liveState, setLiveState] = useState<LiveRadioState | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const currentTrackIndexRef = useRef<number>(-1);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Configure audio for background playback
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: 1,
          interruptionModeAndroid: 1,
        });
      } catch (err) {
        console.error("[LiveRadio] Error configuring audio:", err);
      }
    };
    configureAudio();
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        if (soundRef.current && isPlaying) {
          try {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
              interruptionModeIOS: 1,
              interruptionModeAndroid: 1,
            });
          } catch (err) {
            console.error(
              "[LiveRadio] Error maintaining background audio:",
              err,
            );
          }
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [isPlaying]);

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

      // Get audio URL
      const audioResponse = await appwriteService.getAudioUrl(naat.audioId);
      if (!audioResponse.success || !audioResponse.audioUrl) {
        throw new Error("Failed to get audio URL");
      }

      // Stop previous sound
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (err) {
          console.log("[LiveRadio] Error unloading previous sound:", err);
        }
        soundRef.current = null;
      }

      // Create and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioResponse.audioUrl },
        {
          shouldPlay: true,
          volume: 1.0,
          isLooping: false,
        },
        onPlaybackStatusUpdate,
      );

      soundRef.current = sound;
      setIsPlaying(true);
      setIsLoading(false);

      console.log("[LiveRadio] Now playing:", naat.title);
    } catch (err) {
      console.error("[LiveRadio] Error loading track:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [loadLiveState]);

  /**
   * Handle playback status updates
   */
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error("[LiveRadio] Playback error:", status.error);
        setError(new Error(`Playback error: ${status.error}`));
      }
      return;
    }

    setIsPlaying(status.isPlaying);

    // When track finishes, check for next track
    if (status.didJustFinish) {
      console.log("[LiveRadio] Track finished, checking for next track...");
      checkAndAdvanceTrack();
    }
  }, []);

  /**
   * Check if server has advanced to next track, or advance locally
   */
  const checkAndAdvanceTrack = useCallback(async () => {
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
  }, [loadAndPlayCurrentTrack]);

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
    if (soundRef.current) {
      // Resume existing sound
      await soundRef.current.playAsync();
    } else {
      // Load and play current track
      await loadAndPlayCurrentTrack();
    }
  }, [loadAndPlayCurrentTrack]);

  /**
   * Pause live radio
   */
  const pause = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
    }
  }, []);

  /**
   * Stop live radio
   */
  const stop = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (err) {
        console.error("[LiveRadio] Error stopping:", err);
      }
      soundRef.current = null;
    }
    setIsPlaying(false);
    setCurrentNaat(null);
  }, []);

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
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
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
