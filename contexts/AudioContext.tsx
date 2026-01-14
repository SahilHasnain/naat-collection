import {
  resetTrackPlayer,
  setRepeatMode,
  setupTrackPlayer,
} from "@/services/TrackPlayerService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import TrackPlayer, {
  Event,
  State,
  Track,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from "react-native-track-player";

export interface AudioMetadata {
  audioUrl: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  isLocalFile: boolean;
  audioId?: string;
  youtubeId?: string;
}

interface AudioContextType {
  // State
  currentAudio: AudioMetadata | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  volume: number;
  error: Error | null;
  isRepeatEnabled: boolean;
  isAutoplayEnabled: boolean;

  // Actions
  loadAndPlay: (audio: AudioMetadata) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (positionMillis: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  stop: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  toggleRepeat: () => Promise<void>;
  toggleAutoplay: () => Promise<void>;
  setAutoplayCallback: (callback: (() => Promise<void>) | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const REPEAT_KEY = "@audio_repeat_enabled";
const AUTOPLAY_KEY = "@audio_autoplay_enabled";

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentAudio, setCurrentAudio] = useState<AudioMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(1.0);
  const [error, setError] = useState<Error | null>(null);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);

  // Get playback state from TrackPlayer
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress();

  // Derive isPlaying from playback state
  const isPlaying =
    playbackState.state === State.Playing ||
    playbackState.state === State.Buffering;

  const autoplayCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const isRepeatEnabledRef = useRef(false);
  const isAutoplayEnabledRef = useRef(false);
  const isLoadingRef = useRef(false);
  const hasInitialized = useRef(false);

  // Sync refs with state
  useEffect(() => {
    isRepeatEnabledRef.current = isRepeatEnabled;
  }, [isRepeatEnabled]);

  useEffect(() => {
    isAutoplayEnabledRef.current = isAutoplayEnabled;
  }, [isAutoplayEnabled]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Initialize Track Player
  useEffect(() => {
    const init = async () => {
      if (!hasInitialized.current) {
        const success = await setupTrackPlayer();
        if (success) {
          hasInitialized.current = true;
          console.log("[AudioContext] Track Player ready");
        } else {
          console.error("[AudioContext] Track Player initialization failed");
        }
      }
    };

    init();
  }, []);

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [repeatValue, autoplayValue] = await Promise.all([
          AsyncStorage.getItem(REPEAT_KEY),
          AsyncStorage.getItem(AUTOPLAY_KEY),
        ]);

        if (repeatValue !== null) {
          const enabled = repeatValue === "true";
          setIsRepeatEnabled(enabled);
          await setRepeatMode(enabled);
        }
        if (autoplayValue !== null) {
          setIsAutoplayEnabled(autoplayValue === "true");
        }
      } catch (err) {
        console.error("[AudioContext] Error loading preferences:", err);
      }
    };

    loadPreferences();
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log("[AudioContext] App state changed to:", nextAppState);
      // TrackPlayer handles background automatically
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle track player events
  useTrackPlayerEvents([Event.PlaybackQueueEnded], async (event) => {
    if (event.type === Event.PlaybackQueueEnded) {
      console.log("[AudioContext] Track finished");

      // Use refs to get current values
      const repeatEnabled = isRepeatEnabledRef.current;
      const autoplayEnabled = isAutoplayEnabledRef.current;

      console.log(
        "[AudioContext] Repeat enabled:",
        repeatEnabled,
        "Autoplay enabled:",
        autoplayEnabled
      );

      // Handle repeat
      if (repeatEnabled) {
        console.log("[AudioContext] Repeating track");
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
      } else if (autoplayEnabled && autoplayCallbackRef.current) {
        // Handle autoplay - play random track
        console.log("[AudioContext] Autoplay triggered");
        autoplayCallbackRef.current();
      }
    }
  });

  // Load and play audio
  const loadAndPlay = useCallback(async (audio: AudioMetadata) => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log("[AudioContext] Already loading audio, ignoring request");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("[AudioContext] Loading audio:", audio.title);

      // Reset track player (clears queue and stops playback)
      await resetTrackPlayer();

      // Create track for TrackPlayer
      const track: Track = {
        url: audio.audioUrl,
        title: audio.title,
        artist: audio.channelName,
        artwork: audio.thumbnailUrl,
      };

      // Add track to queue
      await TrackPlayer.add(track);

      // Start playback
      await TrackPlayer.play();

      setCurrentAudio(audio);
      setIsLoading(false);

      console.log("[AudioContext] Audio loaded and playing");
    } catch (err) {
      console.error("[AudioContext] Error loading audio:", err);
      setError(err as Error);
      setIsLoading(false);
      setCurrentAudio(null);
    }
  }, []);

  // Play
  const play = useCallback(async () => {
    try {
      const state = await TrackPlayer.getPlaybackState();
      if (state.state === State.Ready || state.state === State.Paused) {
        await TrackPlayer.play();
        console.log("[AudioContext] Playback started");
      } else {
        console.log("[AudioContext] Cannot play, state:", state.state);
      }
    } catch (err) {
      console.error("[AudioContext] Error playing:", err);
      setError(err as Error);
    }
  }, []);

  // Pause
  const pause = useCallback(async () => {
    try {
      const state = await TrackPlayer.getPlaybackState();
      if (state.state === State.Playing || state.state === State.Buffering) {
        await TrackPlayer.pause();
        console.log("[AudioContext] Playback paused");
      } else {
        console.log("[AudioContext] Cannot pause, state:", state.state);
      }
    } catch (err) {
      console.error("[AudioContext] Error pausing:", err);
      setError(err as Error);
    }
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  // Seek
  const seek = useCallback(async (positionMillis: number) => {
    try {
      const positionSeconds = positionMillis / 1000;
      await TrackPlayer.seekTo(positionSeconds);
      console.log("[AudioContext] Seeked to:", positionSeconds, "seconds");
    } catch (err) {
      console.error("[AudioContext] Error seeking:", err);
      setError(err as Error);
    }
  }, []);

  // Set volume
  const setVolume = useCallback(async (newVolume: number) => {
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);

    try {
      await TrackPlayer.setVolume(clampedVolume);
      console.log("[AudioContext] Volume set to:", clampedVolume);
    } catch (err) {
      console.error("[AudioContext] Error setting volume:", err);
    }
  }, []);

  // Stop and clear
  const stop = useCallback(async () => {
    try {
      await resetTrackPlayer();
    } catch (err) {
      console.error("[AudioContext] Error stopping:", err);
    }

    setCurrentAudio(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Toggle repeat
  const toggleRepeat = useCallback(async () => {
    const newValue = !isRepeatEnabled;
    setIsRepeatEnabled(newValue);
    try {
      await AsyncStorage.setItem(REPEAT_KEY, String(newValue));
      await setRepeatMode(newValue);
      console.log("[AudioContext] Repeat toggled:", newValue);
    } catch (err) {
      console.error("[AudioContext] Error saving repeat preference:", err);
    }
  }, [isRepeatEnabled]);

  // Toggle autoplay
  const toggleAutoplay = useCallback(async () => {
    const newValue = !isAutoplayEnabled;
    setIsAutoplayEnabled(newValue);
    try {
      await AsyncStorage.setItem(AUTOPLAY_KEY, String(newValue));
      console.log("[AudioContext] Autoplay toggled:", newValue);
    } catch (err) {
      console.error("[AudioContext] Error saving autoplay preference:", err);
    }
  }, [isAutoplayEnabled]);

  // Set autoplay callback (to be called from screen with access to data)
  const setAutoplayCallback = useCallback(
    (callback: (() => Promise<void>) | null) => {
      autoplayCallbackRef.current = callback;
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetTrackPlayer();
    };
  }, []);

  const value: AudioContextType = {
    currentAudio,
    isPlaying,
    isLoading,
    position: position * 1000, // Convert to milliseconds for compatibility
    duration: duration * 1000, // Convert to milliseconds for compatibility
    volume,
    error,
    isRepeatEnabled,
    isAutoplayEnabled,
    loadAndPlay,
    play,
    pause,
    seek,
    setVolume,
    stop,
    togglePlayPause,
    toggleRepeat,
    toggleAutoplay,
    setAutoplayCallback,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudioPlayer must be used within AudioProvider");
  }
  return context;
};
