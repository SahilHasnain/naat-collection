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
  onSwitchToVideo?: () => void; // Callback to switch to video mode
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
  onSwitchToVideo,
}) => {
  const {
    currentAudio,
    isPlaying,
    isLoading,
    position,
    duration,
    isRepeatEnabled,
    isAutoplayEnabled,
    togglePlayPause,
    seek,
    toggleRepeat,
    toggleAutoplay,
  } = useAudioPlayer();

  // Download state
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

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

  // Seek backward 10 seconds
  const seekBackward = () => {
    const newPosition = Math.max(0, position - 10000);
    seek(newPosition);
  };

  // Seek forward 10 seconds
  const seekForward = () => {
    const newPosition = Math.min(duration, position + 10000);
    seek(newPosition);
  };

  if (!currentAudio) return null;

  // Show download button for streaming audio (not local files)
  // But also show it if audio is downloaded to allow deletion
  const canDownload = currentAudio.audioId && !currentAudio.isLocalFile;
  const showDownloadButton = canDownload || isDownloaded;

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

          <TouchableOpacity
            onPress={() => setShowOptionsMenu(!showOptionsMenu)}
            className="h-10 w-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Options menu"
          >
            <Ionicons name="ellipsis-vertical" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Options Menu with Overlay */}
        {showOptionsMenu && (
          <>
            {/* Transparent Overlay */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowOptionsMenu(false)}
              className="absolute inset-0 z-40"
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            />

            {/* Menu */}
            <View className="absolute top-16 right-5 bg-neutral-800 rounded-lg shadow-lg z-50 min-w-[200px]">
              {/* Switch to Video */}
              {currentAudio.youtubeId && onSwitchToVideo && (
                <TouchableOpacity
                  onPress={() => {
                    setShowOptionsMenu(false);
                    onSwitchToVideo();
                  }}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-neutral-700"
                  accessibilityRole="button"
                >
                  <Ionicons name="videocam" size={20} color="white" />
                  <Text className="text-white text-base">Switch to Video</Text>
                </TouchableOpacity>
              )}

              {/* Download/Delete */}
              {showDownloadButton && (
                <TouchableOpacity
                  onPress={() => {
                    setShowOptionsMenu(false);
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
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-neutral-700"
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
                    size={20}
                    color={
                      isDownloaded
                        ? "#22c55e"
                        : isDownloading
                          ? "#3b82f6"
                          : "white"
                    }
                  />
                  <Text className="text-white text-base">
                    {isDownloaded
                      ? "Delete Download"
                      : isDownloading
                        ? `Downloading ${Math.round(downloadProgress * 100)}%`
                        : "Download"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Repeat */}
              <TouchableOpacity
                onPress={() => {
                  toggleRepeat();
                  setShowOptionsMenu(false);
                }}
                className="flex-row items-center gap-3 px-4 py-3 border-b border-neutral-700"
                accessibilityRole="button"
              >
                <Ionicons
                  name="repeat"
                  size={20}
                  color={isRepeatEnabled ? colors.accent.primary : "white"}
                />
                <Text
                  className="text-base"
                  style={{
                    color: isRepeatEnabled ? colors.accent.primary : "white",
                  }}
                >
                  Repeat {isRepeatEnabled ? "(On)" : "(Off)"}
                </Text>
              </TouchableOpacity>

              {/* Autoplay */}
              <TouchableOpacity
                onPress={() => {
                  toggleAutoplay();
                  setShowOptionsMenu(false);
                }}
                className="flex-row items-center gap-3 px-4 py-3"
                accessibilityRole="button"
              >
                <Ionicons
                  name="play-forward"
                  size={20}
                  color={isAutoplayEnabled ? colors.accent.primary : "white"}
                />
                <Text
                  className="text-base"
                  style={{
                    color: isAutoplayEnabled ? colors.accent.primary : "white",
                  }}
                >
                  Autoplay {isAutoplayEnabled ? "(On)" : "(Off)"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

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

              {/* Main Playback Controls - Clean and Simple */}
              <View className="flex-row items-center justify-center gap-8">
                {/* Seek Backward 10s */}
                <TouchableOpacity
                  onPress={seekBackward}
                  className="h-14 w-14 items-center justify-center relative"
                  accessibilityLabel="Seek backward 10 seconds"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="refresh"
                    size={40}
                    color="white"
                    style={{ transform: [{ scaleX: -1 }] }}
                  />
                  <Text className="absolute text-xs font-bold text-white">
                    10
                  </Text>
                </TouchableOpacity>

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

                {/* Seek Forward 10s */}
                <TouchableOpacity
                  onPress={seekForward}
                  className="h-14 w-14 items-center justify-center relative"
                  accessibilityLabel="Seek forward 10 seconds"
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh" size={40} color="white" />
                  <Text className="absolute text-xs font-bold text-white">
                    10
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default FullPlayerModal;
