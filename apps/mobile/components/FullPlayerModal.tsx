import { colors, shadows } from "@/constants/theme";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { audioDownloadService } from "@/services/audioDownload";
import { shareService } from "@/services/shareService";
import { showErrorToast, showSuccessToast } from "@/utils";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface FullPlayerModalProps {
  onSwitchToVideo?: () => void;
  topInset?: number;
  bottomInset?: number;
}

const formatTime = (millis: number): string => {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const FullPlayerModal: React.FC<FullPlayerModalProps> = ({
  onSwitchToVideo,
  topInset = 0,
  bottomInset = 0,
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

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isABRepeatMode, setIsABRepeatMode] = useState(false);

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
    setIsABRepeatMode(false);
  }, [currentAudio]);

  const handleDownload = async () => {
    if (!currentAudio?.audioId || currentAudio.isLocalFile || isDownloaded) {
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      await audioDownloadService.downloadAudio(
        currentAudio.audioId,
        currentAudio.audioUrl,
        currentAudio.youtubeId || "",
        currentAudio.title,
        Math.floor(duration / 1000),
        currentAudio.channelName || "Unknown Channel",
        0,
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

  const handleDeleteDownload = async () => {
    if (!currentAudio?.audioId) return;

    Alert.alert(
      "Delete Download",
      "Are you sure you want to delete this downloaded audio?",
      [
        { text: "Cancel", style: "cancel" },
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

  const seekBackward = () => {
    const newPosition = Math.max(0, position - 10000);
    seek(newPosition);
  };

  const seekForward = () => {
    const newPosition = Math.min(duration, position + 10000);
    seek(newPosition);
  };

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
      clearABRepeat();
    }
  };

  const bothPointsSet = abRepeatPointA !== null && abRepeatPointB !== null;

  if (!currentAudio) return null;

  const canDownload = currentAudio.audioId && !currentAudio.isLocalFile;
  const showDownloadButton = canDownload || isDownloaded;

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background.primary}
      />

      <View style={styles.container}>
        <SafeAreaView
          edges={["top", "bottom"]}
          style={{
            flex: 1,
            paddingTop: topInset,
            paddingBottom: bottomInset,
          }}
        >
          <View style={styles.header}>
            {currentAudio.youtubeId && onSwitchToVideo ? (
              <TouchableOpacity
                onPress={onSwitchToVideo}
                style={styles.headerButton}
                accessibilityRole="button"
                accessibilityLabel="Switch to video"
              >
                <Ionicons
                  name="videocam"
                  size={22}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerButton} />
            )}

            <TouchableOpacity
              onPress={() => setShowOptionsMenu(!showOptionsMenu)}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Options menu"
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>

          {showOptionsMenu && (
            <>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setShowOptionsMenu(false)}
                style={styles.menuOverlay}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              />

              <View style={[styles.menuContainer, { top: topInset + 52 }]}>
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
                    style={styles.menuItem}
                  >
                    <View style={styles.menuItemIcon}>
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
                            ? colors.accent.success
                            : isDownloading
                              ? colors.accent.secondary
                              : colors.text.secondary
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuItemText}>
                        {isDownloaded
                          ? "Delete Download"
                          : isDownloading
                            ? "Downloading..."
                            : "Download"}
                      </Text>
                      {isDownloading && (
                        <Text style={styles.menuItemSubtext}>
                          {Math.round(downloadProgress * 100)}% complete
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={async () => {
                    setShowOptionsMenu(false);
                    await shareService.shareCurrentAudio(
                      currentAudio.title,
                      currentAudio.channelName,
                      currentAudio.youtubeId,
                      currentAudio.naatId,
                    );
                  }}
                  style={styles.menuItem}
                >
                  <View style={styles.menuItemIcon}>
                    <Ionicons
                      name="arrow-redo-outline"
                      size={20}
                      color={colors.text.secondary}
                    />
                  </View>
                  <Text style={styles.menuItemText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    toggleRepeat();
                    setShowOptionsMenu(false);
                  }}
                  style={styles.menuItem}
                >
                  <View
                    style={[
                      styles.menuItemIcon,
                      isRepeatEnabled && {
                        backgroundColor: colors.accent.primary + "20",
                      },
                    ]}
                  >
                    <Ionicons
                      name="repeat"
                      size={20}
                      color={
                        isRepeatEnabled
                          ? colors.accent.primary
                          : colors.text.secondary
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.menuItemText,
                      isRepeatEnabled && { color: colors.accent.primary },
                    ]}
                  >
                    Repeat
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    toggleAutoplay();
                    setShowOptionsMenu(false);
                  }}
                  style={styles.menuItem}
                >
                  <View
                    style={[
                      styles.menuItemIcon,
                      isAutoplayEnabled && {
                        backgroundColor: colors.accent.secondary + "20",
                      },
                    ]}
                  >
                    <Ionicons
                      name="play-forward"
                      size={20}
                      color={
                        isAutoplayEnabled
                          ? colors.accent.secondary
                          : colors.text.secondary
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.menuItemText,
                      isAutoplayEnabled && { color: colors.accent.secondary },
                    ]}
                  >
                    Autoplay
                  </Text>
                </TouchableOpacity>

                {!bothPointsSet && (
                  <TouchableOpacity
                    onPress={() => {
                      handleToggleABRepeatMode();
                      setShowOptionsMenu(false);
                    }}
                    style={styles.menuItem}
                  >
                    <View
                      style={[
                        styles.menuItemIcon,
                        isABRepeatMode && {
                          backgroundColor: colors.accent.primary + "20",
                        },
                      ]}
                    >
                      <Ionicons
                        name="repeat"
                        size={20}
                        color={
                          isABRepeatMode
                            ? colors.accent.primary
                            : colors.text.secondary
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.menuItemText,
                        isABRepeatMode && { color: colors.accent.primary },
                      ]}
                    >
                      A/B Repeat
                    </Text>
                  </TouchableOpacity>
                )}

                {bothPointsSet && (
                  <>
                    <View style={styles.menuItem}>
                      <View
                        style={[
                          styles.menuItemIcon,
                          { backgroundColor: colors.accent.primary + "20" },
                        ]}
                      >
                        <Ionicons
                          name="repeat"
                          size={20}
                          color={colors.accent.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.menuItemText, { color: colors.accent.primary }]}
                        >
                          A/B Repeat
                        </Text>
                        <Text style={styles.menuItemSubtext}>Loop active</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        handleClearABRepeat();
                        setShowOptionsMenu(false);
                      }}
                      style={styles.menuItemLast}
                    >
                      <View style={styles.menuItemIcon}>
                        <Ionicons
                          name="close-circle-outline"
                          size={20}
                          color={colors.text.secondary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.menuItemText}>Clear Loop</Text>
                        <Text style={styles.menuItemSubtext}>
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
              <Text style={styles.loadingText}>
                {currentAudio.isLocalFile
                  ? "Preparing audio..."
                  : "Loading audio..."}
              </Text>
            </View>
          ) : (
            <View style={styles.content}>
              <View style={styles.artworkArea}>
                <View style={styles.artworkContainer}>
                  <View style={styles.artworkShadow}>
                    <Image
                      source={{ uri: currentAudio.thumbnailUrl }}
                      style={styles.artwork}
                      contentFit="cover"
                      transition={300}
                      cachePolicy="memory-disk"
                    />
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <Text numberOfLines={2} style={styles.title}>
                    {currentAudio.title}
                  </Text>
                </View>
              </View>

              <View style={styles.controlsArea}>
                <View style={styles.progressSection}>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration}
                    value={position}
                    onSlidingComplete={seek}
                    minimumTrackTintColor={colors.accent.primary}
                    maximumTrackTintColor={colors.background.elevated}
                    thumbTintColor={colors.accent.primary}
                  />

                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                  </View>

                  {(abRepeatPointA !== null || abRepeatPointB !== null) && (
                    <View style={styles.abMarkersContainer}>
                      {abRepeatPointA !== null && (
                        <View
                          style={[
                            styles.abMarker,
                            styles.abMarkerA,
                            {
                              left: `${(abRepeatPointA / duration) * 100}%`,
                            },
                          ]}
                        />
                      )}
                      {abRepeatPointB !== null && (
                        <View
                          style={[
                            styles.abMarker,
                            styles.abMarkerB,
                            {
                              left: `${(abRepeatPointB / duration) * 100}%`,
                            },
                          ]}
                        />
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.transportControls}>
                  <TouchableOpacity
                    onPress={seekBackward}
                    style={styles.transportButton}
                    accessibilityLabel="Seek backward 10 seconds"
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name="replay-10"
                      size={32}
                      color={colors.text.primary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={togglePlayPause}
                    style={styles.playButton}
                    accessibilityRole="button"
                    accessibilityLabel={isPlaying ? "Pause" : "Play"}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={32}
                      color={colors.background.primary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={seekForward}
                    style={styles.transportButton}
                    accessibilityLabel="Seek forward 10 seconds"
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name="forward-10"
                      size={32}
                      color={colors.text.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {isABRepeatMode && !bothPointsSet && (
                <View style={styles.abControls}>
                  <TouchableOpacity
                    onPress={handleSetPointA}
                    style={[
                      styles.abButton,
                      {
                        backgroundColor:
                          abRepeatPointA !== null
                            ? colors.accent.success
                            : colors.background.tertiary,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Set point A"
                  >
                    <Ionicons
                      name="flag"
                      size={16}
                      color={
                        abRepeatPointA !== null
                          ? colors.background.primary
                          : colors.text.primary
                      }
                    />
                    <Text
                      style={[
                        styles.abButtonText,
                        {
                          color:
                            abRepeatPointA !== null
                              ? colors.background.primary
                              : colors.text.primary,
                        },
                      ]}
                    >
                      Point A
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSetPointB}
                    style={[
                      styles.abButton,
                      {
                        backgroundColor:
                          abRepeatPointB !== null
                            ? colors.accent.error
                            : colors.background.tertiary,
                        opacity: abRepeatPointA === null ? 0.5 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Set point B"
                    disabled={abRepeatPointA === null}
                  >
                    <Ionicons
                      name="flag"
                      size={16}
                      color={
                        abRepeatPointB !== null
                          ? colors.text.primary
                          : colors.text.tertiary
                      }
                    />
                    <Text
                      style={[
                        styles.abButtonText,
                        {
                          color:
                            abRepeatPointB !== null
                              ? colors.text.primary
                              : abRepeatPointA === null
                                ? colors.text.disabled
                                : colors.text.primary,
                        },
                      ]}
                    >
                      Point B
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </SafeAreaView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  menuContainer: {
    position: "absolute",
    right: 20,
    borderRadius: 16,
    overflow: "hidden",
    zIndex: 50,
    minWidth: 220,
    backgroundColor: colors.background.secondary,
    ...shadows.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.secondary,
  },
  menuItemLast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemIcon: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderRadius: 20,
    width: 36,
    height: 36,
    backgroundColor: colors.background.elevated,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.primary,
  },
  menuItemSubtext: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 13,
    color: colors.text.tertiary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  artworkArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  artworkContainer: {
    width: "100%",
    alignItems: "center",
  },
  artworkShadow: {
    borderRadius: 20,
    overflow: "hidden",
    width: "88%",
    aspectRatio: 16 / 9,
    ...shadows.lg,
  },
  artwork: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  infoSection: {
    width: "100%",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
    textAlign: "center",
    lineHeight: 26,
    letterSpacing: -0.3,
  },

  progressSection: {
    width: "100%",
    marginBottom: 4,
  },
  controlsArea: {
    paddingBottom: 8,
  },
  slider: {
    width: "100%",
    height: 36,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text.tertiary,
    fontVariant: ["tabular-nums"],
  },
  abMarkersContainer: {
    position: "relative",
    width: "100%",
    height: 6,
    marginTop: 8,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: colors.background.tertiary,
  },
  abMarker: {
    position: "absolute",
    width: 3,
    height: "100%",
    borderRadius: 1.5,
  },
  abMarkerA: {
    backgroundColor: colors.accent.success,
  },
  abMarkerB: {
    backgroundColor: colors.accent.error,
  },
  transportControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
    marginTop: 12,
  },
  transportButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
  },
  playButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent.primary,
    ...shadows.accent,
  },
  abControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 28,
  },
  abButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  abButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default FullPlayerModal;
