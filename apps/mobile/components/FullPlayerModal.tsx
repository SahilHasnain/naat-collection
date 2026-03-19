import { colors } from "@/constants/theme";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { audioDownloadService } from "@/services/audioDownload";
import { showErrorToast, showSuccessToast } from "@/utils";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  StyleSheet,
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
    abRepeatPointA,
    abRepeatPointB,
    isABRepeatActive,
    togglePlayPause,
    seek,
    toggleRepeat,
    toggleAutoplay,
    setABRepeatPointA,
    setABRepeatPointB,
    clearABRepeat,
  } = useAudioPlayer();

  // Download state
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isABRepeatMode, setIsABRepeatMode] = useState(false);

  // Check if audio is downloaded when currentAudio changes
  useEffect(() => {
    const checkDownloadStatus = async () => {
      if (currentAudio?.audioId && !currentAudio.isLocalFile) {
        const downloaded = await audioDownloadService.isDownloaded(
          currentAudio.audioId,
        );
        setIsDownloaded(downloaded);
      } else if (currentAudio?.isLocalFile) {
        setIsDownloaded(true);
      } else {
        setIsDownloaded(false);
      }
    };

    checkDownloadStatus();

    // Reset A/B repeat mode UI when new audio loads
    setIsABRepeatMode(false);
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
        Math.floor(duration / 1000), // Convert from milliseconds to seconds
        currentAudio.channelName || "Unknown Channel",
        0, // views - not available in AudioMetadata
        (progress) => {
          setDownloadProgress(progress.progress);
        },
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
      ],
    );
  };

  // Seek backward 15 seconds
  const seekBackward = () => {
    const newPosition = Math.max(0, position - 15000);
    seek(newPosition);
  };

  // Seek forward 15 seconds
  const seekForward = () => {
    const newPosition = Math.min(duration, position + 15000);
    seek(newPosition);
  };

  // A/B Repeat handlers
  const handleSetPointA = () => {
    setABRepeatPointA(position);
    showSuccessToast("Point A set");
  };

  const handleSetPointB = () => {
    if (abRepeatPointA === null) {
      showErrorToast("Please set point A first");
      return;
    }
    if (position <= abRepeatPointA) {
      showErrorToast("Point B must be after point A");
      return;
    }
    setABRepeatPointB(position);
    showSuccessToast("Point B set - Loop active");
  };

  const handleClearABRepeat = () => {
    clearABRepeat();
    setIsABRepeatMode(false);
    showSuccessToast("A/B repeat cleared");
  };

  const handleToggleABRepeatMode = () => {
    const newMode = !isABRepeatMode;
    setIsABRepeatMode(newMode);
    if (!newMode) {
      // If turning off mode, clear any set points
      clearABRepeat();
    }
  };

  // Check if both points are set
  const bothPointsSet = abRepeatPointA !== null && abRepeatPointB !== null;

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
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background.primary}
      />

      <SafeAreaView
        edges={["top", "bottom"]}
        className="flex-1"
        style={{ backgroundColor: colors.background.primary }}
      >
        {/* Header with Video Toggle and Options Button */}
        <View className="flex-row items-center justify-between px-5 py-4">
          {/* Switch to Video Button */}
          {currentAudio.youtubeId && onSwitchToVideo && (
            <TouchableOpacity
              onPress={onSwitchToVideo}
              className="items-center justify-center w-10 h-10"
              accessibilityRole="button"
              accessibilityLabel="Switch to video"
            >
              <Ionicons name="videocam" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}
          {(!currentAudio.youtubeId || !onSwitchToVideo) && (
            <View className="w-10" />
          )}

          {/* Options Menu Button */}
          <TouchableOpacity
            onPress={() => setShowOptionsMenu(!showOptionsMenu)}
            className="items-center justify-center w-10 h-10"
            accessibilityRole="button"
            accessibilityLabel="Options menu"
          >
            <Ionicons
              name="ellipsis-vertical"
              size={24}
              color={colors.text.primary}
            />
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
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            />

            {/* Menu */}
            <View
              className="absolute top-20 right-5 rounded-2xl overflow-hidden z-50 min-w-[220px]"
              style={{
                backgroundColor: colors.background.secondary,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
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
                        [{ text: "OK" }],
                      );
                    } else {
                      handleDownload();
                    }
                  }}
                  className="flex-row items-center px-5 py-4"
                  style={{
                    backgroundColor:
                      showDownloadButton && (isDownloaded || isDownloading)
                        ? "transparent"
                        : "transparent",
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border.secondary,
                  }}
                  accessibilityRole="button"
                >
                  <View
                    className="items-center justify-center mr-3 rounded-full w-9 h-9"
                    style={{ backgroundColor: colors.background.elevated }}
                  >
                    <Ionicons
                      name={
                        isDownloaded
                          ? "checkmark-circle"
                          : isDownloading
                            ? "hourglass"
                            : "download-outline"
                      }
                      size={20}
                      color={
                        isDownloaded
                          ? "#22c55e"
                          : isDownloading
                            ? "#3b82f6"
                            : "#e5e5e5"
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium"
                      style={{ color: colors.text.primary }}
                    >
                      {isDownloaded
                        ? "Delete Download"
                        : isDownloading
                          ? "Downloading..."
                          : "Download"}
                    </Text>
                    {isDownloading && (
                      <Text className="text-xs text-neutral-400 mt-0.5">
                        {Math.round(downloadProgress * 100)}% complete
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* Repeat */}
              <TouchableOpacity
                onPress={() => {
                  toggleRepeat();
                  setShowOptionsMenu(false);
                }}
                className="flex-row items-center px-5 py-4"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.secondary,
                }}
                accessibilityRole="button"
              >
                <View
                  className="items-center justify-center mr-3 rounded-full w-9 h-9"
                  style={{
                    backgroundColor: isRepeatEnabled
                      ? colors.accent.primary + "20"
                      : colors.background.elevated,
                  }}
                >
                  <Ionicons
                    name="repeat"
                    size={20}
                    color={isRepeatEnabled ? colors.accent.primary : "#e5e5e5"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color: isRepeatEnabled
                        ? colors.accent.primary
                        : colors.text.primary,
                    }}
                  >
                    Repeat
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Autoplay */}
              <TouchableOpacity
                onPress={() => {
                  toggleAutoplay();
                  setShowOptionsMenu(false);
                }}
                className="flex-row items-center px-5 py-4"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.secondary,
                }}
                accessibilityRole="button"
              >
                <View
                  className="items-center justify-center mr-3 rounded-full w-9 h-9"
                  style={{
                    backgroundColor: isAutoplayEnabled
                      ? colors.accent.primary + "20"
                      : colors.background.elevated,
                  }}
                >
                  <Ionicons
                    name="play-forward"
                    size={20}
                    color={
                      isAutoplayEnabled ? colors.accent.primary : "#e5e5e5"
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color: isAutoplayEnabled
                        ? colors.accent.primary
                        : colors.text.primary,
                    }}
                  >
                    Autoplay
                  </Text>
                </View>
              </TouchableOpacity>

              {/* A/B Repeat Mode Toggle - Show when no points are set */}
              {!bothPointsSet && (
                <TouchableOpacity
                  onPress={() => {
                    handleToggleABRepeatMode();
                    setShowOptionsMenu(false);
                  }}
                  className="flex-row items-center px-5 py-4"
                  style={{
                    borderBottomWidth: bothPointsSet ? 1 : 0,
                    borderBottomColor: colors.border.secondary,
                  }}
                  accessibilityRole="button"
                >
                  <View
                    className="items-center justify-center mr-3 rounded-full w-9 h-9"
                    style={{
                      backgroundColor: isABRepeatMode
                        ? colors.accent.primary + "20"
                        : colors.background.elevated,
                    }}
                  >
                    <Ionicons
                      name="repeat"
                      size={20}
                      color={isABRepeatMode ? colors.accent.primary : "#e5e5e5"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: isABRepeatMode
                          ? colors.accent.primary
                          : colors.text.primary,
                      }}
                    >
                      A/B Repeat
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Show set points when both are set */}
              {bothPointsSet && (
                <>
                  <TouchableOpacity
                    className="flex-row items-center px-5 py-4"
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border.secondary,
                    }}
                    disabled
                  >
                    <View
                      className="items-center justify-center mr-3 rounded-full w-9 h-9"
                      style={{ backgroundColor: colors.accent.primary + "20" }}
                    >
                      <Ionicons
                        name="repeat"
                        size={20}
                        color={colors.accent.primary}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium"
                        style={{ color: colors.accent.primary }}
                      >
                        A/B Repeat
                      </Text>
                      <Text className="text-xs text-neutral-400 mt-0.5">
                        Loop active
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      handleClearABRepeat();
                      setShowOptionsMenu(false);
                    }}
                    className="flex-row items-center px-5 py-4"
                    accessibilityRole="button"
                  >
                    <View
                      className="items-center justify-center mr-3 rounded-full w-9 h-9"
                      style={{ backgroundColor: colors.background.elevated }}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={20}
                        color="#e5e5e5"
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium"
                        style={{ color: colors.text.primary }}
                      >
                        Clear Loop
                      </Text>
                      <Text className="text-xs text-neutral-400 mt-0.5">
                        Remove A/B points
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {isLoading ? (
          <View className="items-center justify-center flex-1">
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text className="mt-4 text-sm text-neutral-400">
              {currentAudio.isLocalFile
                ? "Preparing audio..."
                : "Loading audio..."}
            </Text>
          </View>
        ) : (
          <View className="flex-1">
            {/* Album Art / Thumbnail */}
            <View className="items-center justify-center flex-1 px-6">
              <View
                className="relative overflow-hidden rounded-xl"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.35,
                  shadowRadius: 24,
                  elevation: 10,
                }}
              >
                <Image
                  source={{ uri: currentAudio.thumbnailUrl }}
                  style={{ width: 340, height: 191 }}
                  className="rounded-xl"
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    "rgba(0, 0, 0, 0.12)",
                    "rgba(0, 0, 0, 0.04)",
                    "rgba(0, 0, 0, 0.22)",
                    "rgba(0, 0, 0, 0.42)",
                  ]}
                  locations={[0, 0.32, 0.72, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            </View>

            {/* Playback Controls */}
            <View className="px-6 pb-10">
              {/* Seek Bar */}
              <View className="mb-6">
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
                <View className="flex-row justify-between px-1">
                  <Text className="text-xs font-medium text-neutral-500">
                    {formatTime(position)}
                  </Text>
                  <Text className="text-xs font-medium text-neutral-500">
                    {formatTime(duration)}
                  </Text>
                </View>

                {/* A/B Repeat Markers */}
                {(abRepeatPointA !== null || abRepeatPointB !== null) && (
                  <View className="relative w-full h-2 mt-2">
                    {abRepeatPointA !== null && (
                      <View
                        className="absolute w-1 h-2 bg-green-500"
                        style={{
                          left: `${(abRepeatPointA / duration) * 100}%`,
                        }}
                      />
                    )}
                    {abRepeatPointB !== null && (
                      <View
                        className="absolute w-1 h-2 bg-red-500"
                        style={{
                          left: `${(abRepeatPointB / duration) * 100}%`,
                        }}
                      />
                    )}
                  </View>
                )}
              </View>

              {/* Main Playback Controls */}
              <View className="flex-row items-center justify-center gap-6 mt-2">
                {/* Seek Backward 15s */}
                <TouchableOpacity
                  onPress={seekBackward}
                  className="relative items-center justify-center w-16 h-16"
                  accessibilityLabel="Seek backward 15 seconds"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="refresh"
                    size={36}
                    color="rgba(255, 255, 255, 0.5)"
                    style={{ transform: [{ scaleX: -1 }] }}
                  />
                  <Text
                    className="absolute text-[10px] font-semibold"
                    style={{ color: "rgba(255, 255, 255, 0.7)" }}
                  >
                    15
                  </Text>
                </TouchableOpacity>

                {/* Play/Pause Button */}
                <TouchableOpacity
                  onPress={togglePlayPause}
                  className="items-center justify-center w-20 h-20 rounded-full"
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? "Pause" : "Play"}
                  style={{
                    backgroundColor: colors.accent.primary,
                    borderWidth: 2,
                    borderColor: "rgba(29, 185, 84, 0.3)",
                    shadowColor: colors.accent.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={36}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>

                {/* Seek Forward 15s */}
                <TouchableOpacity
                  onPress={seekForward}
                  className="relative items-center justify-center w-16 h-16"
                  accessibilityLabel="Seek forward 15 seconds"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="refresh"
                    size={36}
                    color="rgba(255, 255, 255, 0.5)"
                  />
                  <Text
                    className="absolute text-[10px] font-semibold"
                    style={{ color: "rgba(255, 255, 255, 0.7)" }}
                  >
                    15
                  </Text>
                </TouchableOpacity>
              </View>

              {/* A/B Repeat Buttons - Show when mode is on but points not fully set */}
              {isABRepeatMode && !bothPointsSet && (
                <View className="flex-row items-center justify-center gap-3 mt-8">
                  <TouchableOpacity
                    onPress={handleSetPointA}
                    className="flex-row items-center gap-2 px-5 py-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        abRepeatPointA !== null
                          ? "#22c55e"
                          : colors.background.elevated,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Set point A"
                  >
                    <Ionicons
                      name="flag"
                      size={18}
                      color={
                        abRepeatPointA !== null ? "black" : colors.text.primary
                      }
                    />
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color:
                          abRepeatPointA !== null
                            ? "black"
                            : colors.text.primary,
                      }}
                    >
                      Point A
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSetPointB}
                    className="flex-row items-center gap-2 px-5 py-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        abRepeatPointB !== null
                          ? "#ef4444"
                          : colors.background.elevated,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Set point B"
                    disabled={abRepeatPointA === null}
                  >
                    <Ionicons
                      name="flag"
                      size={18}
                      color={
                        abRepeatPointB !== null ? colors.text.primary : "#666"
                      }
                    />
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color:
                          abRepeatPointB !== null
                            ? colors.text.primary
                            : abRepeatPointA === null
                              ? "#666"
                              : colors.text.primary,
                      }}
                    >
                      Point B
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default FullPlayerModal;
