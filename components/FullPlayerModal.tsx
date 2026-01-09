import { colors } from "@/constants/theme";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { audioDownloadService } from "@/services/audioDownload";
import { showErrorToast, showSuccessToast } from "@/utils";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface FullPlayerModalProps {
  visible: boolean;
  onClose: () => void;
}

// Format milliseconds to MM:SS
const formatTime = (millis: number): string => {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const FullPlayerModal: React.FC<FullPlayerModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    currentAudio,
    isPlaying,
    isLoading,
    position,
    duration,
    volume,
    togglePlayPause,
    seek,
    setVolume,
  } = useAudioPlayer();

  // Download state
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Check if audio is downloaded when currentAudio changes
  useEffect(() => {
    const checkDownloadStatus = async () => {
      if (currentAudio?.audioId && !currentAudio.isLocalFile) {
        const downloaded = await audioDownloadService.isDownloaded(
          currentAudio.audioId
        );
        setIsDownloaded(downloaded);
      } else if (currentAudio?.isLocalFile) {
        setIsDownloaded(true);
      } else {
        setIsDownloaded(false);
      }
    };

    checkDownloadStatus();
  }, [currentAudio]);

  // Download audio
  const handleDownload = async () => {
    if (!currentAudio?.audioId || currentAudio.isLocalFile || isDownloaded)
      return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      await audioDownloadService.downloadAudio(
        currentAudio.audioId,
        currentAudio.audioUrl,
        currentAudio.youtubeId || "",
        currentAudio.title,
        (progress) => {
          setDownloadProgress(progress.progress);
        }
      );

      setIsDownloaded(true);
      showSuccessToast("Audio downloaded successfully");
    } catch (error) {
      console.error("Download failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Download failed";
      showErrorToast(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  // Delete downloaded audio
  const handleDeleteDownload = async () => {
    if (!currentAudio?.audioId) return;

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
          onPress: async () => {
            try {
              await audioDownloadService.deleteAudio(currentAudio.audioId!);
              setIsDownloaded(false);
              showSuccessToast("Download deleted successfully");
            } catch (error) {
              console.error("Failed to delete download:", error);
              showErrorToast("Failed to delete download");
            }
          },
        },
      ]
    );
  };

  if (!currentAudio) return null;

  // Show download button only for streaming audio (not local files)
  const canDownload = currentAudio.audioId && !currentAudio.isLocalFile;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="black" />

      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-black">
        {/* Header with Close Button */}
        <View className="px-5 py-4 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={onClose}
            className="h-10 w-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Close player"
          >
            <Ionicons name="chevron-down" size={28} color="white" />
          </TouchableOpacity>

          <Text className="text-sm text-neutral-400">Now Playing</Text>

          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text className="mt-4 text-white">
              {currentAudio.isLocalFile
                ? "Preparing audio..."
                : "Loading audio..."}
            </Text>
          </View>
        ) : (
          <View className="flex-1">
            {/* Album Art / Thumbnail */}
            <View className="flex-1 items-center justify-center px-8">
              <Image
                source={{ uri: currentAudio.thumbnailUrl }}
                style={{ width: 320, height: 320 }}
                className="rounded-2xl"
                contentFit="cover"
                cachePolicy="memory-disk"
              />

              {/* Title and Channel */}
              <View className="mt-8 w-full">
                <Text
                  className="text-center text-2xl font-bold text-white"
                  numberOfLines={2}
                >
                  {currentAudio.title}
                </Text>
                <Text className="mt-2 text-center text-base text-neutral-400">
                  {currentAudio.channelName}
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
                  maximumValue={duration}
                  value={position}
                  onSlidingComplete={seek}
                  minimumTrackTintColor={colors.accent.primary}
                  maximumTrackTintColor={colors.background.elevated}
                  thumbTintColor={colors.accent.primary}
                />

                {/* Time Labels */}
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-400">
                    {formatTime(position)}
                  </Text>
                  <Text className="text-sm text-neutral-400">
                    {formatTime(duration)}
                  </Text>
                </View>
              </View>

              {/* Play/Pause Button with Download Controls */}
              <View className="mb-6 flex-row items-center justify-center gap-6">
                {/* Play/Pause Button */}
                <TouchableOpacity
                  onPress={togglePlayPause}
                  className="h-20 w-20 items-center justify-center rounded-full bg-white"
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? "Pause" : "Play"}
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={40}
                    color={colors.background.primary}
                  />
                </TouchableOpacity>

                {/* Download/Delete Button */}
                {canDownload && (
                  <TouchableOpacity
                    onPress={() => {
                      if (isDownloaded) {
                        handleDeleteDownload();
                      } else if (isDownloading) {
                        Alert.alert(
                          "Download in Progress",
                          `Downloading... ${Math.round(downloadProgress * 100)}%`,
                          [{ text: "OK" }]
                        );
                      } else {
                        handleDownload();
                      }
                    }}
                    className={`h-16 w-16 items-center justify-center rounded-full ${
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
                    {isDownloading ? (
                      <View className="items-center justify-center">
                        <ActivityIndicator size="small" color="white" />
                        <Text className="text-xs text-white mt-1">
                          {Math.round(downloadProgress * 100)}%
                        </Text>
                      </View>
                    ) : (
                      <Ionicons
                        name={isDownloaded ? "checkmark-circle" : "download"}
                        size={28}
                        color="white"
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Volume Control */}
              <View className="flex-row items-center">
                <Ionicons
                  name="volume-low"
                  size={24}
                  color={colors.text.primary}
                />
                <Slider
                  style={{ flex: 1, marginHorizontal: 12 }}
                  minimumValue={0}
                  maximumValue={1}
                  value={volume}
                  onValueChange={setVolume}
                  minimumTrackTintColor={colors.accent.primary}
                  maximumTrackTintColor={colors.background.elevated}
                  thumbTintColor={colors.accent.primary}
                />
                <Ionicons
                  name="volume-high"
                  size={24}
                  color={colors.text.primary}
                />
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default FullPlayerModal;
