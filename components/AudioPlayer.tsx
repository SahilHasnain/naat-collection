import { colors } from "@/constants/theme";
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
  Alert,
} from "react-native";

export interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  onError: (error: Error) => void;
  onPositionChange?: (position: number) => void;
  autoPlay?: boolean; // Auto-start playback when loaded
  isLocalFile?: boolean; // Indicates if audioUrl is a local file path
  // Download controls
  isDownloaded?: boolean;
  isDownloading?: boolean;
  downloadProgress?: number;
  onDownload?: () => void;
  onDeleteDownload?: () => void;
  canDownload?: boolean;
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

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  title,
  channelName,
  thumbnailUrl,
  onError,
  onPositionChange,
  autoPlay = false,
  isLocalFile = false,
  isDownloaded = false,
  isDownloading = false,
  downloadProgress = 0,
  onDownload,
  onDeleteDownload,
  canDownload = false,
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
          setPlaybackState((prev) => ({ ...prev, error, isLoading: false }));
          onError(error);

          Alert.alert(
            "Playback Error",
            `Unable to play audio: ${status.error}`,
            [{ text: "OK" }]
          );
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
    [onError, onPositionChange]
  );

  // Initialize audio and load the sound
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const loadAudio = async () => {
      try {
        console.log(
          "[AudioPlayer] Starting to load audio:",
          audioUrl.substring(0, 50) + "..."
        );

        // Configure audio mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        console.log("[AudioPlayer] Audio mode configured, creating sound...");

        // Create a timeout promise to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Audio loading timed out after 15 seconds"));
          }, 15000);
        });

        // Race between loading audio and timeout
        const { sound } = (await Promise.race([
          Audio.Sound.createAsync(
            { uri: audioUrl },
            { shouldPlay: autoPlay, volume: 1.0 },
            onPlaybackStatusUpdate
          ),
          timeoutPromise,
        ])) as { sound: Audio.Sound };

        // Clear timeout if successful
        clearTimeout(timeoutId);

        console.log("[AudioPlayer] Audio loaded successfully");

        if (isMounted) {
          soundRef.current = sound;
          setPlaybackState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        clearTimeout(timeoutId);

        console.error("[AudioPlayer] Error loading audio:", error);

        if (isMounted) {
          const err = error as Error;
          setPlaybackState((prev) => ({
            ...prev,
            isLoading: false,
            error: err,
          }));
          onError(err);

          Alert.alert(
            "Audio Loading Failed",
            err.message || "Unable to load audio file. Please try again.",
            [{ text: "OK" }]
          );
        }
      }
    };

    loadAudio();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [audioUrl, onError, onPlaybackStatusUpdate]);

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
        <ActivityIndicator size="large" color={colors.text.primary} />
        <Text className="mt-4 text-white">Loading audio...</Text>
      </View>
    );
  }

  if (playbackState.error) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-8">
        <Ionicons name="alert-circle" size={64} color={colors.accent.error} />
        <Text className="mt-4 text-center text-xl font-bold text-white">
          Audio Loading Error
        </Text>
        <Text className="mt-2 text-center text-base text-neutral-400">
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
          className="h-64 w-96 rounded-lg"
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
          <Text className="mt-2 text-center text-base text-neutral-400">
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
            minimumTrackTintColor={colors.accent.primary}
            maximumTrackTintColor={colors.background.elevated}
            thumbTintColor={colors.accent.primary}
          />

          {/* Time Labels */}
          <View className="flex-row justify-between">
            <Text className="text-sm text-neutral-400">
              {formatTime(playbackState.position)}
            </Text>
            <Text className="text-sm text-neutral-400">
              {formatTime(playbackState.duration)}
            </Text>
          </View>
        </View>

        {/* Play/Pause Button with Download Controls */}
        <View className="mb-6 flex-row items-center justify-center gap-6">
          {/* Play/Pause Button - Left */}
          {playbackState.hasCompleted ? (
            <TouchableOpacity
              onPress={handleReplay}
              className="h-20 w-20 items-center justify-center rounded-full bg-white"
            >
              <Ionicons
                name="reload"
                size={40}
                color={colors.background.primary}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={togglePlayPause}
              className="h-20 w-20 items-center justify-center rounded-full bg-white"
            >
              <Ionicons
                name={playbackState.isPlaying ? "pause" : "play"}
                size={40}
                color={colors.background.primary}
              />
            </TouchableOpacity>
          )}

          {/* Download/Delete Button - Right */}
          {canDownload && (
            <View>
              {isDownloading ? (
                <View className="h-16 w-16 items-center justify-center">
                  <ActivityIndicator
                    size="large"
                    color={colors.accent.primary}
                  />
                  <Text className="mt-1 text-xs text-neutral-400">
                    {Math.round(downloadProgress * 100)}%
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    if (isDownloaded) {
                      // Show confirmation alert before deleting
                      Alert.alert(
                        "Delete Download",
                        "Are you sure you want to delete this downloaded audio?",
                        [
                          {
                            text: "Cancel",
                            style: "cancel",
                          },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: onDeleteDownload,
                          },
                        ]
                      );
                    } else {
                      onDownload?.();
                    }
                  }}
                  className={`h-16 w-16 items-center justify-center rounded-full ${
                    isDownloaded ? "bg-green-600" : "bg-neutral-700"
                  }`}
                  accessibilityLabel={
                    isDownloaded ? "Delete download" : "Download for offline"
                  }
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={isDownloaded ? "checkmark-circle" : "download"}
                    size={28}
                    color="white"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Volume Control */}
        <View className="flex-row items-center">
          <Ionicons name="volume-low" size={24} color={colors.text.primary} />
          <Slider
            style={{ flex: 1, marginHorizontal: 12 }}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={handleVolumeChange}
            minimumTrackTintColor={colors.accent.primary}
            maximumTrackTintColor={colors.background.elevated}
            thumbTintColor={colors.accent.primary}
          />
          <Ionicons name="volume-high" size={24} color={colors.text.primary} />
        </View>
      </View>
    </View>
  );
};

export default AudioPlayer;
