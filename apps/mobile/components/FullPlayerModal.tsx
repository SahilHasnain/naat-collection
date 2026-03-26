import { colors } from "@/constants/theme";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { audioDownloadService } from "@/services/audioDownload";
import { showErrorToast, showSuccessToast } from "@/utils";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ImageBackground,
  Modal,
  Pressable,
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

const TOP_BUTTONS_HIDE_DELAY_MS = 10000;

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
  const [showTopButtons, setShowTopButtons] = useState(true);
  const hideTopButtonsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const topControlsOpacity = useRef(new Animated.Value(1)).current;
  const topControlsTranslateY = useRef(new Animated.Value(0)).current;
  const bottomOverlayOpacity = useRef(new Animated.Value(1)).current;
  const bottomOverlayTranslateY = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (!visible) {
      if (hideTopButtonsTimerRef.current) {
        clearTimeout(hideTopButtonsTimerRef.current);
        hideTopButtonsTimerRef.current = null;
      }
      setShowTopButtons(true);
      setShowOptionsMenu(false);
      return;
    }

    if (!showTopButtons || showOptionsMenu) {
      return;
    }

    hideTopButtonsTimerRef.current = setTimeout(() => {
      setShowTopButtons(false);
    }, TOP_BUTTONS_HIDE_DELAY_MS);

    return () => {
      if (hideTopButtonsTimerRef.current) {
        clearTimeout(hideTopButtonsTimerRef.current);
        hideTopButtonsTimerRef.current = null;
      }
    };
  }, [visible, showTopButtons, showOptionsMenu]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(topControlsOpacity, {
        toValue: showTopButtons ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(topControlsTranslateY, {
        toValue: showTopButtons ? 0 : -16,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bottomOverlayOpacity, {
        toValue: showTopButtons ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bottomOverlayTranslateY, {
        toValue: showTopButtons ? 0 : 16,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    bottomOverlayOpacity,
    bottomOverlayTranslateY,
    showTopButtons,
    topControlsOpacity,
    topControlsTranslateY,
  ]);

  const handleBlankAreaPress = () => {
    setShowTopButtons((prev) => !prev);
  };

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

      <View style={styles.container}>
        <ImageBackground
          source={require("@/assets/images/gumbad.png")}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[
              "rgba(15, 15, 15, 0.3)",
              "rgba(15, 15, 15, 0.55)",
              "rgba(15, 15, 15, 0.85)",
              colors.background.primary,
            ]}
            locations={[0, 0.35, 0.65, 0.9]}
            style={StyleSheet.absoluteFill}
          />

          <SafeAreaView edges={["top", "bottom"]} className="flex-1">
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleBlankAreaPress}
            />

            {/* Header with Video Toggle and Options Button */}
            <Animated.View
              pointerEvents={showTopButtons ? "auto" : "none"}
              style={{
                opacity: topControlsOpacity,
                transform: [{ translateY: topControlsTranslateY }],
              }}
            >
              <View className="flex-row items-center justify-between px-5 py-4">
                {/* Switch to Video Button */}
                {currentAudio.youtubeId && onSwitchToVideo && (
                  <TouchableOpacity
                    onPress={() => {
                      setShowTopButtons(true);
                      onSwitchToVideo();
                    }}
                    className="items-center justify-center w-10 h-10"
                    accessibilityRole="button"
                    accessibilityLabel="Switch to video"
                  >
                    <Ionicons
                      name="videocam"
                      size={24}
                      color={colors.text.primary}
                    />
                  </TouchableOpacity>
                )}
                {(!currentAudio.youtubeId || !onSwitchToVideo) && (
                  <View className="w-10" />
                )}

                {/* Options Menu Button */}
                <TouchableOpacity
                  onPress={() => {
                    setShowTopButtons(true);
                    setShowOptionsMenu(!showOptionsMenu);
                  }}
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
            </Animated.View>

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

                  {/* Share */}
                  <TouchableOpacity
                    onPress={async () => {
                      setShowOptionsMenu(false);
                      await shareService.shareCurrentAudio(
                        currentAudio.title,
                        currentAudio.channelName,
                        currentAudio.youtubeId,
                        currentAudio.naatId
                      );
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
                      style={{ backgroundColor: colors.background.elevated }}
                    >
                      <Ionicons
                        name="share-outline"
                        size={20}
                        color="#e5e5e5"
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium"
                        style={{ color: colors.text.primary }}
                      >
                        Share
                      </Text>
                    </View>
                  </TouchableOpacity>

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
                <View className="flex-1" />

                {/* Playback Controls */}
                <View className="px-6 pb-10">
                  <Animated.View
                    pointerEvents={showTopButtons ? "auto" : "none"}
                    style={{
                      opacity: bottomOverlayOpacity,
                      transform: [{ translateY: bottomOverlayTranslateY }],
                    }}
                  >
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

                      <View className="flex-row justify-between px-1">
                        <Text className="text-xs font-medium text-neutral-500">
                          {formatTime(position)}
                        </Text>
                        <Text className="text-xs font-medium text-neutral-500">
                          {formatTime(duration)}
                        </Text>
                      </View>

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
                  </Animated.View>

                  {/* Main Playback Controls */}
                  <View className="flex-row items-center justify-center gap-6 mt-2">
                    {/* Seek Backward 10s */}
                    <TouchableOpacity
                      onPress={seekBackward}
                      className="items-center justify-center w-16 h-16"
                      accessibilityLabel="Seek backward 10 seconds"
                      accessibilityRole="button"
                    >
                      <View className="relative items-center justify-center w-12 h-12">
                        <MaterialIcons
                          name="replay-10"
                          size={34}
                          color="rgba(255, 255, 255, 0.82)"
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Play/Pause Button */}
                    <TouchableOpacity
                      onPress={togglePlayPause}
                      className="items-center justify-center w-16 h-16 rounded-full"
                      accessibilityRole="button"
                      accessibilityLabel={isPlaying ? "Pause" : "Play"}
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                        borderWidth: 2,
                        borderColor: "rgba(255, 255, 255, 0.18)",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.16,
                        shadowRadius: 12,
                        elevation: 4,
                      }}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={30}
                        color={colors.text.primary}
                      />
                    </TouchableOpacity>

                    {/* Seek Forward 10s */}
                    <TouchableOpacity
                      onPress={seekForward}
                      className="items-center justify-center w-16 h-16"
                      accessibilityLabel="Seek forward 10 seconds"
                      accessibilityRole="button"
                    >
                      <View className="relative items-center justify-center w-12 h-12">
                        <MaterialIcons
                          name="forward-10"
                          size={34}
                          color="rgba(255, 255, 255, 0.82)"
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* A/B Repeat Buttons - Show when mode is on but points not fully set */}
                  <Animated.View
                    pointerEvents={
                      showTopButtons && isABRepeatMode && !bothPointsSet
                        ? "auto"
                        : "none"
                    }
                    style={{
                      opacity: bottomOverlayOpacity,
                      transform: [{ translateY: bottomOverlayTranslateY }],
                    }}
                  >
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
                              abRepeatPointA !== null
                                ? "black"
                                : colors.text.primary
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
                              abRepeatPointB !== null
                                ? colors.text.primary
                                : "#666"
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
                  </Animated.View>
                </View>
              </View>
            )}
          </SafeAreaView>
        </ImageBackground>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});

export default FullPlayerModal;
