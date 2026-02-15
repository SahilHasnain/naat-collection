import { usePlaybackMode } from "@/contexts/PlaybackModeContext";
import { setupPlayer } from "@/services/trackPlayerService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TrackPlayer, {
  Event,
  RepeatMode,
  State,
  useProgress,
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
  const { mode, setMode, isNormalAudioActive, isLiveRadioActive } =
    usePlaybackMode();
  const [currentAudio, setCurrentAudio] = useState<AudioMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1.0);
  const [error, setError] = useState<Error | null>(null);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);

  // Debug: Log when currentAudio changes
  useEffect(() => {
    console.log(
      "[AudioContext] currentAudio changed:",
      currentAudio?.title || "null",
    );
  }, [currentAudio]);

  const autoplayCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const isRepeatEnabledRef = useRef(false);
  const isAutoplayEnabledRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isSetupRef = useRef(false);

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

  // Setup Track Player on mount
  useEffect(() => {
    const initPlayer = async () => {
      if (isSetupRef.current) return;

      try {
        await setupPlayer();
        isSetupRef.current = true;
        console.log("[AudioContext] Track Player initialized");
      } catch (err) {
        console.error("[AudioContext] Error initializing Track Player:", err);
      }
    };

    initPlayer();
  }, []);

  // Stop normal audio when live radio becomes active
  useEffect(() => {
    if (isLiveRadioActive && currentAudio) {
      console.log("[AudioContext] Live radio active, stopping normal audio");
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  }, [isLiveRadioActive, currentAudio]);

  // Use Track Player hooks for progress
  const { position: trackPosition, duration: trackDuration } = useProgress();

  useEffect(() => {
    setPosition(Math.floor(trackPosition * 1000));
    setDuration(Math.floor(trackDuration * 1000));
  }, [trackPosition, trackDuration]);

  // Listen to playback state changes - only when normal audio is active
  useTrackPlayerEvents([Event.PlaybackState], async (event) => {
    if (!isNormalAudioActive) return;

    if (event.type === Event.PlaybackState) {
      const state = event.state;
      console.log("[AudioContext] Playback state changed:", state);
      setIsPlaying(state === State.Playing);
      setIsLoading(state === State.Buffering || state === State.Loading);

      // Don't clear currentAudio when stopped/paused - keep miniplayer visible
      // Only clear via explicit stop() call (close button)
    }
  });

  // Listen to track end events - only when normal audio is active
  useTrackPlayerEvents([Event.PlaybackQueueEnded], async () => {
    if (!isNormalAudioActive) {
      console.log(
        "[AudioContext] Track finished but normal audio not active, ignoring",
      );
      return;
    }

    console.log("[AudioContext] Track finished");
    setIsPlaying(false);

    const repeatEnabled = isRepeatEnabledRef.current;
    const autoplayEnabled = isAutoplayEnabledRef.current;

    console.log(
      "[AudioContext] Repeat enabled:",
      repeatEnabled,
      "Autoplay enabled:",
      autoplayEnabled,
    );

    if (repeatEnabled) {
      console.log("[AudioContext] Repeating track");
      await TrackPlayer.seekTo(0);
      await TrackPlayer.play();
    } else if (autoplayEnabled && autoplayCallbackRef.current) {
      console.log("[AudioContext] Autoplay triggered");
      autoplayCallbackRef.current();
    } else {
      await TrackPlayer.seekTo(0);
      setPosition(0);
    }
  });

  // Load and play audio
  const loadAndPlay = useCallback(
    async (audio: AudioMetadata) => {
      if (isLoadingRef.current) {
        console.log("[AudioContext] Already loading audio, ignoring request");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log("[AudioContext] Loading audio:", audio.title);

        // Switch to normal audio mode
        setMode("normal");

        // Reset queue and add new track
        await TrackPlayer.reset();
        await TrackPlayer.add({
          url: audio.audioUrl,
          title: audio.title,
          artist: audio.channelName,
          artwork: audio.thumbnailUrl,
        });

        // Set volume and repeat mode
        await TrackPlayer.setVolume(volume);
        await TrackPlayer.setRepeatMode(
          isRepeatEnabledRef.current ? RepeatMode.Track : RepeatMode.Off,
        );

        // Set currentAudio before playing so miniplayer appears immediately
        setCurrentAudio(audio);

        // Play
        await TrackPlayer.play();

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
    [volume, setMode],
  );

  // Play
  const play = useCallback(async () => {
    try {
      await TrackPlayer.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("[AudioContext] Error playing:", err);
      setError(err as Error);
    }
  }, []);

  // Pause
  const pause = useCallback(async () => {
    try {
      await TrackPlayer.pause();
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
    try {
      await TrackPlayer.seekTo(positionMillis / 1000);
      setPosition(positionMillis);
    } catch (err) {
      console.error("[AudioContext] Error seeking:", err);
      setError(err as Error);
    }
  }, []);

  // Set volume
  const setVolume = useCallback(async (newVolume: number) => {
    setVolumeState(newVolume);
    try {
      await TrackPlayer.setVolume(newVolume);
    } catch (err) {
      console.error("[AudioContext] Error setting volume:", err);
    }
  }, []);

  // Stop and clear
  const stop = useCallback(async () => {
    console.log("[AudioContext] stop() called");
    try {
      await TrackPlayer.reset();
    } catch (err) {
      console.error("[AudioContext] Error stopping:", err);
    }

    setCurrentAudio(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setError(null);
    setIsLoading(false);
    setMode("none");
  }, [setMode]);

  // Toggle repeat
  const toggleRepeat = useCallback(async () => {
    const newValue = !isRepeatEnabled;
    setIsRepeatEnabled(newValue);
    try {
      await TrackPlayer.setRepeatMode(
        newValue ? RepeatMode.Track : RepeatMode.Off,
      );
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
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      TrackPlayer.reset();
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
