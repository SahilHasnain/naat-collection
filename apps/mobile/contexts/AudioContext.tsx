import { usePlaybackMode } from "@/contexts/PlaybackModeContext";
import {
  setupPlayer,
  updateNotificationCapabilities,
} from "@/services/trackPlayerService";
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
  abRepeatPointA: number | null;
  abRepeatPointB: number | null;
  isABRepeatActive: boolean;
  playbackRate: number;

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
  setABRepeatPointA: (position: number | null) => void;
  setABRepeatPointB: (position: number | null) => void;
  clearABRepeat: () => void;
  toggleABRepeat: () => void;
  setPlaybackRate: (rate: number) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const REPEAT_KEY = "@audio_repeat_enabled";
const AUTOPLAY_KEY = "@audio_autoplay_enabled";
const PLAYBACK_RATE_KEY = "@audio_playback_rate";

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
  const [abRepeatPointA, setAbRepeatPointA] = useState<number | null>(null);
  const [abRepeatPointB, setAbRepeatPointB] = useState<number | null>(null);
  const [isABRepeatActive, setIsABRepeatActive] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1.0);

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
  const abRepeatPointARef = useRef<number | null>(null);
  const abRepeatPointBRef = useRef<number | null>(null);
  const isABRepeatActiveRef = useRef(false);

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

  useEffect(() => {
    abRepeatPointARef.current = abRepeatPointA;
  }, [abRepeatPointA]);

  useEffect(() => {
    abRepeatPointBRef.current = abRepeatPointB;
  }, [abRepeatPointB]);

  useEffect(() => {
    isABRepeatActiveRef.current = isABRepeatActive;
  }, [isABRepeatActive]);

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [repeatValue, autoplayValue, rateValue] = await Promise.all([
          AsyncStorage.getItem(REPEAT_KEY),
          AsyncStorage.getItem(AUTOPLAY_KEY),
          AsyncStorage.getItem(PLAYBACK_RATE_KEY),
        ]);

        if (repeatValue !== null) {
          setIsRepeatEnabled(repeatValue === "true");
        }
        if (autoplayValue !== null) {
          setIsAutoplayEnabled(autoplayValue === "true");
        }
        if (rateValue !== null) {
          const rate = parseFloat(rateValue);
          if (!isNaN(rate)) {
            setPlaybackRateState(rate);
          }
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
    const newPosition = Math.floor(trackPosition * 1000);
    setPosition(newPosition);
    setDuration(Math.floor(trackDuration * 1000));

    // A/B repeat logic - check if we've passed point B
    if (
      isABRepeatActiveRef.current &&
      abRepeatPointARef.current !== null &&
      abRepeatPointBRef.current !== null &&
      newPosition >= abRepeatPointBRef.current
    ) {
      console.log("[AudioContext] A/B repeat: looping back to point A");
      TrackPlayer.seekTo(abRepeatPointARef.current / 1000);
    }
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

        // Clear A/B repeat points when loading new track
        setAbRepeatPointA(null);
        setAbRepeatPointB(null);
        setIsABRepeatActive(false);

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

        // Update notification capabilities for normal mode (with seek) AFTER adding track
        await updateNotificationCapabilities(false);

        // Set volume, repeat mode, and playback rate
        await TrackPlayer.setVolume(volume);
        await TrackPlayer.setRepeatMode(
          isRepeatEnabledRef.current ? RepeatMode.Track : RepeatMode.Off,
        );
        await TrackPlayer.setRate(playbackRate);

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

  // A/B Repeat functions
  const setABRepeatPointAFunc = useCallback((position: number | null) => {
    setAbRepeatPointA(position);
    console.log("[AudioContext] A/B repeat point A set:", position);
  }, []);

  const setABRepeatPointBFunc = useCallback(
    (position: number | null) => {
      setAbRepeatPointB(position);
      // Automatically enable A/B repeat when point B is set
      if (position !== null && abRepeatPointA !== null) {
        setIsABRepeatActive(true);
        console.log(
          "[AudioContext] A/B repeat point B set and auto-enabled:",
          position,
        );
      } else {
        console.log("[AudioContext] A/B repeat point B set:", position);
      }
    },
    [abRepeatPointA],
  );

  const clearABRepeat = useCallback(() => {
    setAbRepeatPointA(null);
    setAbRepeatPointB(null);
    setIsABRepeatActive(false);
    console.log("[AudioContext] A/B repeat cleared");
  }, []);

  const toggleABRepeat = useCallback(() => {
    if (abRepeatPointA !== null && abRepeatPointB !== null) {
      const newValue = !isABRepeatActive;
      setIsABRepeatActive(newValue);
      console.log("[AudioContext] A/B repeat toggled:", newValue);
    }
  }, [abRepeatPointA, abRepeatPointB, isABRepeatActive]);

  // Set playback rate
  const setPlaybackRate = useCallback(async (rate: number) => {
    try {
      await TrackPlayer.setRate(rate);
      setPlaybackRateState(rate);
      await AsyncStorage.setItem(PLAYBACK_RATE_KEY, String(rate));
      console.log("[AudioContext] Playback rate set to:", rate);
    } catch (err) {
      console.error("[AudioContext] Error setting playback rate:", err);
    }
  }, []);

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
    abRepeatPointA,
    abRepeatPointB,
    isABRepeatActive,
    playbackRate,
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
    setABRepeatPointA: setABRepeatPointAFunc,
    setABRepeatPointB: setABRepeatPointBFunc,
    clearABRepeat,
    toggleABRepeat,
    setPlaybackRate,
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
