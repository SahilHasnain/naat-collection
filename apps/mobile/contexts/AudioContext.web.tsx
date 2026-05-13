import { usePlaybackMode } from "@/contexts/PlaybackModeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  naatId?: string;
}

interface AudioContextType {
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
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const REPEAT_KEY = "@audio_repeat_enabled";
const AUTOPLAY_KEY = "@audio_autoplay_enabled";

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { setMode, isLiveRadioActive, isNormalAudioActive } = usePlaybackMode();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoplayCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const isRepeatEnabledRef = useRef(false);
  const isAutoplayEnabledRef = useRef(false);
  const abRepeatPointARef = useRef<number | null>(null);
  const abRepeatPointBRef = useRef<number | null>(null);
  const isABRepeatActiveRef = useRef(false);

  const [currentAudio, setCurrentAudio] = useState<AudioMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [error, setError] = useState<Error | null>(null);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);
  const [abRepeatPointA, setAbRepeatPointA] = useState<number | null>(null);
  const [abRepeatPointB, setAbRepeatPointB] = useState<number | null>(null);
  const [isABRepeatActive, setIsABRepeatActive] = useState(false);

  useEffect(() => {
    isRepeatEnabledRef.current = isRepeatEnabled;
    if (audioRef.current) {
      audioRef.current.loop = isRepeatEnabled;
    }
  }, [isRepeatEnabled]);

  useEffect(() => {
    isAutoplayEnabledRef.current = isAutoplayEnabled;
  }, [isAutoplayEnabled]);

  useEffect(() => {
    abRepeatPointARef.current = abRepeatPointA;
  }, [abRepeatPointA]);

  useEffect(() => {
    abRepeatPointBRef.current = abRepeatPointB;
  }, [abRepeatPointB]);

  useEffect(() => {
    isABRepeatActiveRef.current = isABRepeatActive;
  }, [isABRepeatActive]);

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
        console.error("[AudioContext.web] Error loading preferences:", err);
      }
    };

    loadPreferences();
  }, []);

  useEffect(() => {
    const audio = new globalThis.Audio();
    audio.preload = "auto";
    audio.volume = volume;
    audio.loop = isRepeatEnabledRef.current;
    audioRef.current = audio;

    const syncTime = () => {
      const nextPosition = Math.floor(audio.currentTime * 1000);
      const nextDuration = Number.isFinite(audio.duration)
        ? Math.floor(audio.duration * 1000)
        : 0;

      setPosition(nextPosition);
      setDuration(nextDuration);

      if (
        isABRepeatActiveRef.current &&
        abRepeatPointARef.current !== null &&
        abRepeatPointBRef.current !== null &&
        nextPosition >= abRepeatPointBRef.current
      ) {
        audio.currentTime = abRepeatPointARef.current / 1000;
      }
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setDuration(Number.isFinite(audio.duration) ? Math.floor(audio.duration * 1000) : 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = async () => {
      setIsPlaying(false);
      setPosition(0);

      if (!isNormalAudioActive) {
        return;
      }

      if (isAutoplayEnabledRef.current && autoplayCallbackRef.current) {
        await autoplayCallbackRef.current();
      }
    };

    const handleError = () => {
      const mediaError = audio.error;
      const nextError = new Error(
        mediaError?.message || "Audio playback failed on web",
      );
      setError(nextError);
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadedmetadata", syncTime);
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadedmetadata", syncTime);
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, [isNormalAudioActive, volume]);

  useEffect(() => {
    if (isLiveRadioActive && isLoading) {
      setIsLoading(false);
    }
  }, [isLiveRadioActive, isLoading]);

  const loadAndPlay = useCallback(
    async (audio: AudioMetadata) => {
      const player = audioRef.current;
      if (!player) {
        throw new Error("Web audio player is not initialized");
      }

      try {
        setMode("normal");
        setError(null);
        setIsLoading(true);
        setCurrentAudio(audio);
        setPosition(0);
        setDuration(0);
        setAbRepeatPointA(null);
        setAbRepeatPointB(null);
        setIsABRepeatActive(false);

        player.pause();
        player.src = audio.audioUrl;
        player.currentTime = 0;
        player.volume = volume;
        player.loop = isRepeatEnabledRef.current;
        player.load();

        await player.play();
      } catch (err) {
        const nextError = err instanceof Error ? err : new Error(String(err));
        console.error("[AudioContext.web] Error loading audio:", nextError);
        setError(nextError);
        setIsLoading(false);
        setIsPlaying(false);
        setCurrentAudio(null);
      }
    },
    [setMode, volume],
  );

  const play = useCallback(async () => {
    const player = audioRef.current;
    if (!player) return;

    try {
      await player.play();
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error(String(err));
      console.error("[AudioContext.web] Error playing:", nextError);
      setError(nextError);
    }
  }, []);

  const pause = useCallback(async () => {
    const player = audioRef.current;
    if (!player) return;
    player.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback(async (positionMillis: number) => {
    const player = audioRef.current;
    if (!player) return;
    player.currentTime = positionMillis / 1000;
    setPosition(positionMillis);
  }, []);

  const setVolume = useCallback(async (newVolume: number) => {
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  const stop = useCallback(async () => {
    const player = audioRef.current;
    if (player) {
      player.pause();
      player.removeAttribute("src");
      player.load();
    }

    setCurrentAudio(null);
    setIsPlaying(false);
    setIsLoading(false);
    setPosition(0);
    setDuration(0);
    setError(null);
    setMode("none");
  }, [setMode]);

  const toggleRepeat = useCallback(async () => {
    const nextValue = !isRepeatEnabled;
    setIsRepeatEnabled(nextValue);
    try {
      await AsyncStorage.setItem(REPEAT_KEY, String(nextValue));
    } catch (err) {
      console.error("[AudioContext.web] Error saving repeat preference:", err);
    }
  }, [isRepeatEnabled]);

  const toggleAutoplay = useCallback(async () => {
    const nextValue = !isAutoplayEnabled;
    setIsAutoplayEnabled(nextValue);
    try {
      await AsyncStorage.setItem(AUTOPLAY_KEY, String(nextValue));
    } catch (err) {
      console.error("[AudioContext.web] Error saving autoplay preference:", err);
    }
  }, [isAutoplayEnabled]);

  const setAutoplayCallback = useCallback(
    (callback: (() => Promise<void>) | null) => {
      autoplayCallbackRef.current = callback;
    },
    [],
  );

  const setABRepeatPointAFunc = useCallback((point: number | null) => {
    setAbRepeatPointA(point);
  }, []);

  const setABRepeatPointBFunc = useCallback(
    (point: number | null) => {
      setAbRepeatPointB(point);
      if (point !== null && abRepeatPointA !== null) {
        setIsABRepeatActive(true);
      }
    },
    [abRepeatPointA],
  );

  const clearABRepeat = useCallback(() => {
    setAbRepeatPointA(null);
    setAbRepeatPointB(null);
    setIsABRepeatActive(false);
  }, []);

  const toggleABRepeat = useCallback(() => {
    if (abRepeatPointA !== null && abRepeatPointB !== null) {
      setIsABRepeatActive((prev) => !prev);
    }
  }, [abRepeatPointA, abRepeatPointB]);

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
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudioPlayer = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudioPlayer must be used within AudioProvider");
  }
  return context;
};
