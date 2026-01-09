import { Audio, AVPlaybackStatus } from "expo-av";
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

  // Actions
  loadAndPlay: (audio: AudioMetadata) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (positionMillis: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  stop: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

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

  const soundRef = useRef<Audio.Sound | null>(null);

  // Configure audio session for background playback
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true, // Enable background playback
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
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

  // Playback status update handler
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
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
      setIsPlaying(false);
      setPosition(0);
    }
  }, []);

  // Load and play audio
  const loadAndPlay = useCallback(
    async (audio: AudioMetadata) => {
      try {
        setIsLoading(true);
        setError(null);

        console.log("[AudioContext] Loading audio:", audio.title);

        // Unload previous sound if exists
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        // Create new sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: audio.audioUrl },
          { shouldPlay: true, volume: volume },
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
        soundRef.current = null;
      } catch (err) {
        console.error("[AudioContext] Error stopping:", err);
      }
    }

    setCurrentAudio(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setError(null);
  }, []);

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
    loadAndPlay,
    play,
    pause,
    seek,
    setVolume,
    stop,
    togglePlayPause,
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
