import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface VideoMetadata {
  videoUrl: string;
  videoId: string; // YouTube video ID
  title: string;
  channelName: string;
  thumbnailUrl: string;
  youtubeId?: string;
  audioId?: string;
}

interface VideoContextType {
  // State
  currentVideo: VideoMetadata | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  isRepeatEnabled: boolean;
  isAutoplayEnabled: boolean;

  // Actions
  loadVideo: (video: VideoMetadata) => void;
  setPlaying: (playing: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  clearVideo: () => void;
  toggleRepeat: () => Promise<void>;
  toggleAutoplay: () => Promise<void>;
  setAutoplayCallback: (callback: (() => Promise<void>) | null) => void;
  handleVideoEnd: () => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

const REPEAT_KEY = "@video_repeat_enabled";
const AUTOPLAY_KEY = "@video_autoplay_enabled";

export const VideoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentVideo, setCurrentVideo] = useState<VideoMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);

  const autoplayCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const isRepeatEnabledRef = useRef(false);
  const isAutoplayEnabledRef = useRef(false);

  // Sync refs with state
  useEffect(() => {
    isRepeatEnabledRef.current = isRepeatEnabled;
  }, [isRepeatEnabled]);

  useEffect(() => {
    isAutoplayEnabledRef.current = isAutoplayEnabled;
  }, [isAutoplayEnabled]);

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
        console.error("[VideoContext] Error loading preferences:", err);
      }
    };

    loadPreferences();
  }, []);

  // Load video
  const loadVideo = useCallback((video: VideoMetadata) => {
    console.log("[VideoContext] Loading video:", video.title);
    setCurrentVideo(video);
    setPosition(0);
    setDuration(0);
    setIsPlaying(false);
  }, []);

  // Set playing state
  const setPlayingState = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  // Clear video
  const clearVideo = useCallback(() => {
    console.log("[VideoContext] Clearing video");
    setCurrentVideo(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  }, []);

  // Toggle repeat
  const toggleRepeat = useCallback(async () => {
    const newValue = !isRepeatEnabled;
    setIsRepeatEnabled(newValue);
    try {
      await AsyncStorage.setItem(REPEAT_KEY, String(newValue));
      console.log("[VideoContext] Repeat toggled:", newValue);
    } catch (err) {
      console.error("[VideoContext] Error saving repeat preference:", err);
    }
  }, [isRepeatEnabled]);

  // Toggle autoplay
  const toggleAutoplay = useCallback(async () => {
    const newValue = !isAutoplayEnabled;
    setIsAutoplayEnabled(newValue);
    try {
      await AsyncStorage.setItem(AUTOPLAY_KEY, String(newValue));
      console.log("[VideoContext] Autoplay toggled:", newValue);
    } catch (err) {
      console.error("[VideoContext] Error saving autoplay preference:", err);
    }
  }, [isAutoplayEnabled]);

  // Set autoplay callback
  const setAutoplayCallback = useCallback(
    (callback: (() => Promise<void>) | null) => {
      autoplayCallbackRef.current = callback;
    },
    []
  );

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    console.log("[VideoContext] Video ended");
    setIsPlaying(false);

    // Use refs to get current values
    const repeatEnabled = isRepeatEnabledRef.current;
    const autoplayEnabled = isAutoplayEnabledRef.current;

    console.log(
      "[VideoContext] Repeat enabled:",
      repeatEnabled,
      "Autoplay enabled:",
      autoplayEnabled
    );

    // Handle repeat - will be handled by YouTube player loop parameter
    if (repeatEnabled) {
      console.log(
        "[VideoContext] Repeat is enabled (handled by YouTube player)"
      );
      // YouTube player will handle repeat via loop parameter
      // We just need to keep the repeat state
    } else if (autoplayEnabled && autoplayCallbackRef.current) {
      // Handle autoplay - play random video
      console.log("[VideoContext] Autoplay triggered");
      autoplayCallbackRef.current();
    } else {
      setPosition(0);
    }
  }, []);

  const value: VideoContextType = {
    currentVideo,
    isPlaying,
    position,
    duration,
    isRepeatEnabled,
    isAutoplayEnabled,
    loadVideo,
    setPlaying: setPlayingState,
    setPosition,
    setDuration,
    clearVideo,
    toggleRepeat,
    toggleAutoplay,
    setAutoplayCallback,
    handleVideoEnd,
  };

  return (
    <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
  );
};

export const useVideoPlayer = () => {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error("useVideoPlayer must be used within VideoProvider");
  }
  return context;
};
