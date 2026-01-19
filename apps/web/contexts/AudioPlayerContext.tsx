"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Audio metadata interface
export interface AudioMetadata {
  audioUrl: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  audioId?: string;
  youtubeId: string;
  isLocalFile?: boolean;
}

// Audio player state interface
export interface AudioPlayerState {
  currentAudio: AudioMetadata | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  isRepeatEnabled: boolean;
  isAutoplayEnabled: boolean;
}

// Audio player actions interface
export interface AudioPlayerActions {
  loadAndPlay: (audio: AudioMetadata) => Promise<void>;
  togglePlayPause: () => void;
  seek: (position: number) => void;
  setVolume: (volume: number) => void;
  stop: () => void;
  toggleRepeat: () => void;
  toggleAutoplay: () => void;
  setAutoplayCallback: (callback: (() => Promise<void>) | null) => void;
}

// Combined context type
interface AudioPlayerContextType {
  state: AudioPlayerState;
  actions: AudioPlayerActions;
}

// Create context with undefined default
const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(
  undefined,
);

// Provider props
interface AudioPlayerProviderProps {
  children: ReactNode;
}

const REPEAT_KEY = "audio_repeat_enabled";
const AUTOPLAY_KEY = "audio_autoplay_enabled";

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  // State management
  const [state, setState] = useState<AudioPlayerState>({
    currentAudio: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    volume: 1,
    isLoading: false,
    isRepeatEnabled: false,
    isAutoplayEnabled: false,
  });

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs for repeat and autoplay to avoid stale closures
  const isRepeatEnabledRef = useRef(false);
  const isAutoplayEnabledRef = useRef(false);
  const autoplayCallbackRef = useRef<(() => Promise<void>) | null>(null);

  // Sync refs with state
  useEffect(() => {
    isRepeatEnabledRef.current = state.isRepeatEnabled;
  }, [state.isRepeatEnabled]);

  useEffect(() => {
    isAutoplayEnabledRef.current = state.isAutoplayEnabled;
  }, [state.isAutoplayEnabled]);

  // Load saved preferences from localStorage
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const repeatValue = localStorage.getItem(REPEAT_KEY);
        const autoplayValue = localStorage.getItem(AUTOPLAY_KEY);

        if (repeatValue !== null) {
          const isRepeat = repeatValue === "true";
          setState((prev) => ({ ...prev, isRepeatEnabled: isRepeat }));
        }
        if (autoplayValue !== null) {
          const isAutoplay = autoplayValue === "true";
          setState((prev) => ({ ...prev, isAutoplayEnabled: isAutoplay }));
        }
      } catch (err) {
        console.error("Error loading preferences:", err);
      }
    };

    loadPreferences();
  }, []);

  // Initialize audio element with event listeners
  useEffect(() => {
    const audio = new Audio();
    audio.volume = state.volume;
    audioRef.current = audio;

    // Event listener: onPlay
    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
    };

    // Event listener: onPause
    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    // Event listener: onTimeUpdate
    const handleTimeUpdate = () => {
      if (audio.currentTime !== undefined) {
        setState((prev) => ({ ...prev, position: audio.currentTime }));
      }
    };

    // Event listener: onLoadedMetadata (duration available)
    const handleLoadedMetadata = () => {
      if (audio.duration !== undefined && !isNaN(audio.duration)) {
        setState((prev) => ({ ...prev, duration: audio.duration }));
      }
    };

    // Event listener: onEnded
    const handleEnded = () => {
      console.log("Track finished");
      setState((prev) => ({
        ...prev,
        isPlaying: false,
      }));

      // Use refs to get current values (not stale closure values)
      const repeatEnabled = isRepeatEnabledRef.current;
      const autoplayEnabled = isAutoplayEnabledRef.current;

      console.log(
        "Repeat enabled:",
        repeatEnabled,
        "Autoplay enabled:",
        autoplayEnabled,
      );

      // Handle repeat
      if (repeatEnabled && audio) {
        console.log("Repeating track");
        audio.currentTime = 0;
        audio.play().catch((error) => {
          console.error("Failed to repeat audio:", error);
        });
      } else if (autoplayEnabled && autoplayCallbackRef.current) {
        // Handle autoplay - play next track
        console.log("Autoplay triggered");
        autoplayCallbackRef.current();
      } else {
        setState((prev) => ({ ...prev, position: 0 }));
        audio.currentTime = 0;
      }
    };

    // Event listener: onError
    const handleError = (e: ErrorEvent | Event) => {
      console.error("Audio playback error:", audio.error);
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
      }));
    };

    // Attach event listeners
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    // Cleanup
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);

      audio.pause();
      audio.src = "";
    };
  }, []);

  // Load and play audio with comprehensive error handling
  const loadAndPlay = useCallback(async (audio: AudioMetadata) => {
    if (!audioRef.current) {
      throw new Error("Audio element not initialized");
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Stop current playback
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      // Load new audio
      audioRef.current.src = audio.audioUrl;

      // Update state with new audio
      setState((prev) => ({
        ...prev,
        currentAudio: audio,
        position: 0,
        duration: 0,
        isLoading: true,
      }));

      // Load the audio
      audioRef.current.load();

      // Wait for audio to be ready and play
      await audioRef.current.play();

      setState((prev) => ({
        ...prev,
        isPlaying: true,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Failed to load and play audio:", error);

      // Provide user feedback based on error type
      let errorMessage = "Failed to play audio. Please try again.";

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage =
            "Playback was blocked. Please interact with the page first.";
        } else if (error.name === "NotSupportedError") {
          errorMessage = "This audio format is not supported by your browser.";
        } else if (error.name === "AbortError") {
          errorMessage = "Audio loading was interrupted.";
        }
      }

      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
      }));

      // Re-throw with user-friendly message
      throw new Error(errorMessage);
    }
  }, []);

  // Toggle play/pause with error handling
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !state.currentAudio) return;

    if (state.isPlaying) {
      audioRef.current.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      audioRef.current
        .play()
        .then(() => {
          setState((prev) => ({ ...prev, isPlaying: true }));
        })
        .catch((error) => {
          console.error("Failed to play audio:", error);
          setState((prev) => ({ ...prev, isPlaying: false }));
        });
    }
  }, [state.isPlaying, state.currentAudio]);

  // Seek to position
  const seek = useCallback((position: number) => {
    if (!audioRef.current) return;

    try {
      // Set the audio element's currentTime
      audioRef.current.currentTime = position;
      // Immediately update state for instant UI feedback
      setState((prev) => ({ ...prev, position }));
    } catch (error) {
      console.error("Error seeking:", error);
    }
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioRef.current.volume = clampedVolume;
    setState((prev) => ({ ...prev, volume: clampedVolume }));
  }, []);

  // Stop playback
  const stop = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState((prev) => ({
      currentAudio: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      volume: prev.volume,
      isLoading: false,
      isRepeatEnabled: prev.isRepeatEnabled,
      isAutoplayEnabled: prev.isAutoplayEnabled,
    }));
  }, []);

  // Toggle repeat
  const toggleRepeat = useCallback(() => {
    setState((prev) => {
      const newValue = !prev.isRepeatEnabled;
      try {
        localStorage.setItem(REPEAT_KEY, String(newValue));
        console.log("Repeat toggled:", newValue);
      } catch (err) {
        console.error("Error saving repeat preference:", err);
      }
      return { ...prev, isRepeatEnabled: newValue };
    });
  }, []);

  // Toggle autoplay
  const toggleAutoplay = useCallback(() => {
    setState((prev) => {
      const newValue = !prev.isAutoplayEnabled;
      try {
        localStorage.setItem(AUTOPLAY_KEY, String(newValue));
        console.log("Autoplay toggled:", newValue);
      } catch (err) {
        console.error("Error saving autoplay preference:", err);
      }
      return { ...prev, isAutoplayEnabled: newValue };
    });
  }, []);

  // Set autoplay callback (to be called from screen with access to data)
  const setAutoplayCallback = useCallback(
    (callback: (() => Promise<void>) | null) => {
      autoplayCallbackRef.current = callback;
    },
    [],
  );

  // Actions object
  const actions: AudioPlayerActions = {
    loadAndPlay,
    togglePlayPause,
    seek,
    setVolume,
    stop,
    toggleRepeat,
    toggleAutoplay,
    setAutoplayCallback,
  };

  // Context value
  const value: AudioPlayerContextType = {
    state,
    actions,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

// Custom hook to use audio player context
export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);

  if (context === undefined) {
    throw new Error(
      "useAudioPlayer must be used within an AudioPlayerProvider",
    );
  }

  return context;
}
