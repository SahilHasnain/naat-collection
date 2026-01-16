import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Audio, AVPlaybackStatus } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  isAudioReady: boolean;
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
    isAudioReady: false,
  });
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
    let timeoutId: ReturnType<typeof setTimeout>;

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
            { shouldPlay: false, volume: 1.0 },
            onPlaybackStatusUpdate
          ),
          timeoutPromise,
        ])) as { sound: Audio.Sound };

        // Only start playing after audio is fully loaded if autoPlay is true
        if (autoPlay && isMounted) {
          try {
            await sound.playAsync();
          } catch (error) {
            console.error("[AudioPlayer] Error auto-playing:", error);
          }
        }

        // Clear timeout if successful
        clearTimeout(timeoutId);

        console.log("[AudioPlayer] Audio loaded successfully");

        if (isMounted) {
          soundRef.current = sound;
          setPlaybackState((prev) => ({
            ...prev,
            isLoading: false,
            isAudioReady: true,
          }));
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
  }, [audioUrl, autoPlay, onError, onPlaybackStatusUpdate]);

  // Play/pause toggle
  const togglePlayPause = async () => {
    if (!soundRef.current || !playbackState.isAudioReady) return;

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

  // Seek backward 10 seconds
  const seekBackward = async () => {
    const newPosition = Math.max(0, playbackState.position - 10000);
    await seekToPosition(newPosition);
  };

  // Seek forward 10 seconds
  const seekForward = async () => {
    const newPosition = Math.min(
      playbackState.duration,
      playbackState.position + 10000
    );
    await seekToPosition(newPosition);
  };

  if (playbackState.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color={colors.text.primary} />
        <Text className="mt-4 text-white">
          {isLocalFile ? "Preparing audio..." : "Loading audio..."}
        </Text>
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

        {/* Play/Pause Button with Seek and Download Controls */}
        <View className="mb-6 flex-row items-center justify-center gap-4">
          {/* Seek Backward 10s */}
          <TouchableOpacity
            onPress={seekBackward}
            className="h-14 w-14 items-center justify-center relative"
            accessibilityLabel="Seek backward 10 seconds"
            accessibilityRole="button"
          >
            <Ionicons
              name="refresh"
              size={32}
              color="white"
              style={{ transform: [{ scaleX: -1 }] }}
            />
            <Text className="absolute text-xs font-bold text-white">10</Text>
          </TouchableOpacity>

          {/* Play/Pause/Replay Button - Center */}
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

          {/* Seek Forward 10s */}
          <TouchableOpacity
            onPress={seekForward}
            className="h-14 w-14 items-center justify-center relative"
            accessibilityLabel="Seek forward 10 seconds"
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={32} color="white" />
            <Text className="absolute text-xs font-bold text-white">10</Text>
          </TouchableOpacity>

          {/* Download/Delete Button */}
          {canDownload && (
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
                } else if (isDownloading) {
                  // Show downloading status
                  Alert.alert(
                    "Download in Progress",
                    `Downloading... ${Math.round(downloadProgress * 100)}%`,
                    [{ text: "OK" }]
                  );
                } else {
                  onDownload?.();
                }
              }}
              className={`h-14 w-14 items-center justify-center rounded-full ${
                isDownloaded
                  ? "bg-green-600"
                  : isDownloading
                    ? "bg-blue-600"
                    : "bg-neutral-700"
              }`}
              accessibilityLabel={
                isDownloaded
                  ? "Delete download"
                  : isDownloading
                    ? "Downloading"
                    : "Download for offline"
              }
              accessibilityRole="button"
            >
              <Ionicons
                name={
                  isDownloaded
                    ? "checkmark-circle"
                    : isDownloading
                      ? "hourglass"
                      : "download"
                }
                size={24}
                color="white"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default AudioPlayer;
