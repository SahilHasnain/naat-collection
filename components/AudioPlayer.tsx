import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Audio, AVPlaybackStatus } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  onError: (error: Error) => void;
  onPositionChange?: (position: number) => void;
  onUrlExpired?: () => void;
}

interface PlaybackState {
  position: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  hasCompleted: boolean;
  error: Error | null;
}

// Format milliseconds to MM:SS
const formatTime = (millis: number): string => {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Check if error indicates URL expiration
const isUrlExpiredError = (error: string): boolean => {
  const errorLower = error.toLowerCase();
  // Check for common HTTP error codes and messages that indicate expired URLs
  return (
    errorLower.includes("403") ||
    errorLower.includes("404") ||
    errorLower.includes("forbidden") ||
    errorLower.includes("not found") ||
    errorLower.includes("expired") ||
    errorLower.includes("invalid url") ||
    errorLower.includes("network error") ||
    errorLower.includes("failed to load")
  );
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  title,
  channelName,
  thumbnailUrl,
  onError,
  onPositionChange,
  onUrlExpired,
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    position: 0,
    duration: 0,
    isPlaying: false,
    isLoading: true,
    hasCompleted: false,
    error: null,
  });
  const [volume, setVolume] = useState(1.0);

  const soundRef = useRef<Audio.Sound | null>(null);

  // Handle playback status updates
  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          const error = new Error(`Playback error: ${status.error}`);

          // Check if this is a URL expiration error
          if (isUrlExpiredError(status.error) && onUrlExpired) {
            onUrlExpired();
            return;
          }

          setPlaybackState((prev) => ({ ...prev, error, isLoading: false }));
          onError(error);
        }
        return;
      }

      // Check if playback has completed
      const hasCompleted = status.didJustFinish || false;

      setPlaybackState((prev) => ({
        ...prev,
        position: status.positionMillis || 0,
        duration: status.durationMillis || 0,
        isPlaying: status.isPlaying,
        hasCompleted,
      }));

      // Notify parent of position changes
      if (onPositionChange && status.positionMillis) {
        onPositionChange(status.positionMillis);
      }
    },
    [onError, onPositionChange, onUrlExpired]
  );

  // Initialize audio and load the sound
  useEffect(() => {
    let isMounted = true;

    const loadAudio = async () => {
      try {
        // Configure audio mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        // Create and load sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false, volume: 1.0 },
          onPlaybackStatusUpdate
        );

        if (isMounted) {
          soundRef.current = sound;
          setPlaybackState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        if (isMounted) {
          const err = error as Error;

          // Check if this is a URL expiration error
          if (isUrlExpiredError(err.message) && onUrlExpired) {
            onUrlExpired();
            return;
          }

          setPlaybackState((prev) => ({
            ...prev,
            isLoading: false,
            error: err,
          }));
          onError(err);
        }
      }
    };

    loadAudio();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [audioUrl, onError, onPlaybackStatusUpdate, onUrlExpired]);

  // Play/pause toggle
  const togglePlayPause = async () => {
    if (!soundRef.current) return;

    try {
      if (playbackState.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (error) {
      onError(error as Error);
    }
  };

  // Seek to position
  const seekToPosition = async (positionMillis: number) => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.setPositionAsync(positionMillis);
    } catch (error) {
      onError(error as Error);
    }
  };

  // Handle volume change
  const handleVolumeChange = async (value: number) => {
    setVolume(value);
    if (soundRef.current) {
      try {
        await soundRef.current.setVolumeAsync(value);
      } catch (error) {
        onError(error as Error);
      }
    }
  };

  // Replay audio from beginning
  const handleReplay = async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();
      setPlaybackState((prev) => ({ ...prev, hasCompleted: false }));
    } catch (error) {
      onError(error as Error);
    }
  };

  if (playbackState.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="mt-4 text-white">Loading audio...</Text>
      </View>
    );
  }

  if (playbackState.error) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-8">
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text className="mt-4 text-center text-xl font-bold text-white">
          Audio Loading Error
        </Text>
        <Text className="mt-2 text-center text-base text-gray-400">
          {playbackState.error.message}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Album Art / Thumbnail */}
      <View className="flex-1 items-center justify-center p-8">
        <Image
          source={{ uri: thumbnailUrl }}
          className="h-80 w-80 rounded-lg"
          resizeMode="cover"
        />

        {/* Title and Channel */}
        <View className="mt-8 w-full px-4">
          <Text
            className="text-center text-xl font-bold text-white"
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text className="mt-2 text-center text-base text-gray-400">
            {channelName}
          </Text>
        </View>
      </View>

      {/* Playback Controls */}
      <View className="px-6 pb-8">
        {/* Seek Bar */}
        <View className="mb-4">
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={0}
            maximumValue={playbackState.duration}
            value={playbackState.position}
            onSlidingComplete={seekToPosition}
            minimumTrackTintColor="#1DB954"
            maximumTrackTintColor="#404040"
            thumbTintColor="#1DB954"
          />

          {/* Time Labels */}
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-400">
              {formatTime(playbackState.position)}
            </Text>
            <Text className="text-sm text-gray-400">
              {formatTime(playbackState.duration)}
            </Text>
          </View>
        </View>

        {/* Play/Pause Button */}
        <View className="mb-6 items-center">
          {playbackState.hasCompleted ? (
            <TouchableOpacity
              onPress={handleReplay}
              className="h-20 w-20 items-center justify-center rounded-full bg-white"
            >
              <Ionicons name="reload" size={40} color="#000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={togglePlayPause}
              className="h-20 w-20 items-center justify-center rounded-full bg-white"
            >
              <Ionicons
                name={playbackState.isPlaying ? "pause" : "play"}
                size={40}
                color="#000"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Volume Control */}
        <View className="flex-row items-center">
          <Ionicons name="volume-low" size={24} color="#fff" />
          <Slider
            style={{ flex: 1, marginHorizontal: 12 }}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={handleVolumeChange}
            minimumTrackTintColor="#1DB954"
            maximumTrackTintColor="#404040"
            thumbTintColor="#1DB954"
          />
          <Ionicons name="volume-high" size={24} color="#fff" />
        </View>
      </View>
    </View>
  );
};

export default AudioPlayer;
