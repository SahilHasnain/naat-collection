import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1.0);
  const [error, setError] = useState<Error | null>(null);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const autoplayCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const isRepeatEnabledRef = useRef(false);
  const isAutoplayEnabledRef = useRef(false);
  const isLoadingRef = useRef(false);

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

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [repeatValue, autoplayValue] = await Promise.all([
          AsyncStorage.getItem(REPEAT_KEY),
          AsyncStorage.getItem(AUTOPLAY_KEY),
        ]);

        if (repeatValue !== null) {
          setIsRepeatEnabled(repeatValue === "true");
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

  // Configure audio session for background playback
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true, // Enable background playback
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: 1, // Do not mix with other audio
          interruptionModeAndroid: 1, // Do not mix with other audio
        });
        console.log(
          "[AudioContext] Audio mode configured for background playback"
        );
      } catch (err) {
        console.error("[AudioContext] Error configuring audio mode:", err);
      }
    };

    configureAudio();
  }, []);

  // Handle app state changes to maintain audio in background
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log("[AudioContext] App state changed to:", nextAppState);

      if (nextAppState === "background" || nextAppState === "inactive") {
        // App going to background - ensure audio continues
        if (soundRef.current && isPlaying) {
          try {
            // Re-configure audio mode to ensure it stays active
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
              interruptionModeIOS: 1,
              interruptionModeAndroid: 1,
            });
            console.log(
              "[AudioContext] Audio mode re-configured for background"
            );
          } catch (err) {
            console.error(
              "[AudioContext] Error maintaining background audio:",
              err
            );
          }
        }
      } else if (nextAppState === "active") {
        // App coming to foreground
        console.log("[AudioContext] App returned to foreground");
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, [isPlaying]);

  // Playback status update handler - using ref pattern for stability
  const onPlaybackStatusUpdateRef =
    useRef<(status: AVPlaybackStatus) => void>(undefined);

  useEffect(() => {
    onPlaybackStatusUpdateRef.current = (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          console.error("[AudioContext] Playback error:", status.error);
          setError(new Error(`Playback error: ${status.error}`));
          setIsLoading(false);
        }
        return;
      }

      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      // Handle playback completion
      if (status.didJustFinish) {
        console.log("[AudioContext] Track finished");
        setIsPlaying(false);

        // Use refs to get current values (not stale closure values)
        const repeatEnabled = isRepeatEnabledRef.current;
        const autoplayEnabled = isAutoplayEnabledRef.current;

        console.log(
          "[AudioContext] Repeat enabled:",
          repeatEnabled,
          "Autoplay enabled:",
          autoplayEnabled
        );

        // Handle repeat
        if (repeatEnabled && soundRef.current) {
          console.log("[AudioContext] Repeating track");
          soundRef.current.replayAsync();
        } else if (autoplayEnabled && autoplayCallbackRef.current) {
          // Handle autoplay - play random track
          console.log("[AudioContext] Autoplay triggered");
          autoplayCallbackRef.current();
        } else {
          setPosition(0);
        }
      }
    };
  });

  // Stable callback reference that never changes
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    onPlaybackStatusUpdateRef.current?.(status);
  }, []);

  // Load and play audio
  const loadAndPlay = useCallback(
    async (audio: AudioMetadata) => {
      // Prevent multiple simultaneous loads
      if (isLoadingRef.current) {
        console.log("[AudioContext] Already loading audio, ignoring request");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log("[AudioContext] Loading audio:", audio.title);

        // Unload previous sound if exists - CRITICAL: Stop first, then unload
        if (soundRef.current) {
          try {
            console.log("[AudioContext] Stopping and unloading previous sound");
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          } catch (err) {
            console.log("[AudioContext] Error unloading previous sound:", err);
            // Continue anyway - we want to load the new sound
          }
          soundRef.current = null;
        }

        // Create new sound with proper configuration for background playback
        const { sound } = await Audio.Sound.createAsync(
          { uri: audio.audioUrl },
          {
            shouldPlay: true,
            volume: volume,
            isLooping: false,
            isMuted: false,
            rate: 1.0,
            shouldCorrectPitch: true,
          },
          onPlaybackStatusUpdate
        );

        soundRef.current = sound;
        setCurrentAudio(audio);
        setIsLoading(false);
        setIsPlaying(true);

        console.log("[AudioContext] Audio loaded and playing");
      } catch (err) {
        console.error("[AudioContext] Error loading audio:", err);
        setError(err as Error);
        setIsLoading(false);
        setCurrentAudio(null);
      }
    },
    [volume, onPlaybackStatusUpdate]
  );

  // Play
  const play = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    } catch (err) {
      console.error("[AudioContext] Error playing:", err);
      setError(err as Error);
    }
  }, []);

  // Pause
  const pause = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
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
    if (!soundRef.current) return;

    try {
      await soundRef.current.setPositionAsync(positionMillis);
      setPosition(positionMillis);
    } catch (err) {
      console.error("[AudioContext] Error seeking:", err);
      setError(err as Error);
    }
  }, []);

  // Set volume
  const setVolume = useCallback(async (newVolume: number) => {
    setVolumeState(newVolume);

    if (soundRef.current) {
      try {
        await soundRef.current.setVolumeAsync(newVolume);
      } catch (err) {
        console.error("[AudioContext] Error setting volume:", err);
      }
    }
  }, []);

  // Stop and clear
  const stop = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (err) {
        console.error("[AudioContext] Error stopping:", err);
      }
      soundRef.current = null;
    }

    setCurrentAudio(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setError(null);
    setIsLoading(false);
  }, []);

  // Toggle repeat
  const toggleRepeat = useCallback(async () => {
    const newValue = !isRepeatEnabled;
    setIsRepeatEnabled(newValue);
    try {
      await AsyncStorage.setItem(REPEAT_KEY, String(newValue));
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
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const value: AudioContextType = {
    currentAudio,
    isPlaying,
    isLoading,
    position,
    duration,
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
