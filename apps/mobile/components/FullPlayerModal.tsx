import { colors, shadows } from "@/constants/theme";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useTheme } from "@/contexts/ThemeContext";
import {
  clearPendingVoiceTransform,
  getPendingVoiceTransform,
  getVoiceUrl,
  startVoiceTransform,
  watchVoiceTransform,
  type VoicePreset,
} from "@/services/voiceTransform";
import { audioDownloadService } from "@/services/audioDownload";
import { appwriteService } from "@/services/appwrite";
import { shareService } from "@/services/shareService";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/utils";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface FullPlayerModalProps {
  onBack?: () => void;
  naatId?: string;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
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

const getVoiceTransformStage = (progress: number): string => {
  if (progress < 10) return "Queued";
  if (progress < 35) return "Downloading audio";
  if (progress < 85) return "Processing audio";
  return "Uploading transformed audio";
};

const getVoicePresetLabel = (preset: VoicePreset): string => {
  if (preset === "subtle") return "Adult";
  if (preset === "younger") return "Young Adult";
  return "Teenage";
};

const voicePresetPreferenceKey = (trackId: string) =>
  `@voice_preset_preference:${trackId}`;
const VOICE_PRESETS: VoicePreset[] = ["subtle", "younger", "high"];

interface WebVolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const WebVolumeSlider: React.FC<WebVolumeSliderProps> = ({ value, onChange }) => {
  if (Platform.OS !== "web") return null;

  return React.createElement("input", {
    type: "range",
    min: 0,
    max: 1,
    step: 0.01,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(event.currentTarget.value));
    },
    "aria-label": "Volume",
    style: {
      accentColor: colors.accent.primary,
      cursor: "pointer",
      height: 150,
      writingMode: "vertical-lr",
      direction: "rtl",
    },
  });
};

const FullPlayerModal: React.FC<FullPlayerModalProps> = ({
  onBack,
  naatId,
  isFavorite = false,
  onFavoritePress,
  onSwitchToVideo,
  topInset = 0,
  bottomInset = 0,
}) => {
  const { isDesktopWeb, isWeb } = useResponsiveLayout();
  const { resolvedTheme } = useTheme();
  const {
    currentAudio,
    isPlaying,
    isLoading,
    position,
    duration,
    volume,
    isRepeatEnabled,
    isAutoplayEnabled,
    abRepeatPointA,
    abRepeatPointB,
    isABRepeatActive,
    loadAndPlay,
    togglePlayPause,
    seek,
    setVolume,
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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isABRepeatMode, setIsABRepeatMode] = useState(false);
  const [isExportingAB, setIsExportingAB] = useState(false);
  const [hasExportedAB, setHasExportedAB] = useState(false);
  const [voicePreset, setVoicePreset] = useState<VoicePreset | null>(null);
  const [isTransformingVoice, setIsTransformingVoice] = useState(false);
  const [voiceTransformProgress, setVoiceTransformProgress] = useState(0);
  const [voiceTransformRefresh, setVoiceTransformRefresh] = useState(0);
  const menuItemStyle = [
    styles.menuItem,
    { borderBottomColor: colors.border.menuDivider },
  ];

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
    setHasExportedAB(false);
  }, [currentAudio]);

  useEffect(() => {
    setVoicePreset(null);
    setIsTransformingVoice(false);
    setVoiceTransformProgress(0);
  }, [currentAudio?.naatId]);

  useEffect(() => {
    const audio = currentAudio;
    const audioId = audio?.voiceSourceAudioId ?? audio?.audioId;
    if (!audio || !audioId || audio.isLocalFile) return;
    let stopWatching: (() => void) | undefined;
    let cancelled = false;

    const resumePendingJob = async () => {
      const pending = await getPendingVoiceTransform(audioId);
      if (!pending || cancelled) return;
      setIsTransformingVoice(true);
      setVoicePreset(pending.voicePreset);
      stopWatching = watchVoiceTransform(pending.jobId, async (job) => {
        if (job.status === "done" && job.outputAudioId) {
          await clearPendingVoiceTransform(pending.key);
          setIsTransformingVoice(false);
          if (cancelled) return;
          await loadAndPlay({ ...audio, audioId: job.outputAudioId, voiceSourceAudioId: audioId, audioUrl: getVoiceUrl(job.outputAudioId), isLocalFile: false });
          showSuccessToast(`${getVoicePresetLabel(pending.voicePreset)} tone is ready`);
        } else if (job.status === "failed") {
          await clearPendingVoiceTransform(pending.key);
          setIsTransformingVoice(false);
          if (!cancelled) showErrorToast(job.error || "Voice transformation failed");
        }
      });
    };
    void resumePendingJob();
    return () => { cancelled = true; stopWatching?.(); };
  }, [currentAudio?.audioId, voiceTransformRefresh]);

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
        currentAudio.views || 0,
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

  const handleVoiceTransform = async (preset: VoicePreset) => {
    const audio = currentAudio;
    const sourceAudioId = audio?.voiceSourceAudioId ?? audio?.audioId;
    if (!audio || !sourceAudioId || audio.isLocalFile) return;
    if (isTransformingVoice) {
      showInfoToast("Please wait for the current transformation to finish.");
      return;
    }

    try {
      setIsTransformingVoice(true);
      setVoicePreset(preset);
      setShowOptionsMenu(false);
      await AsyncStorage.setItem(
        voicePresetPreferenceKey(audio.naatId ?? sourceAudioId),
        preset,
      );
      await startVoiceTransform(sourceAudioId, preset);
      setVoiceTransformRefresh((value) => value + 1);
      showInfoToast("Voice conversion started in the background.");
    } catch (error) {
      setIsTransformingVoice(false);
      console.error("Voice transformation failed:", error);
      showErrorToast(error instanceof Error ? error.message : "Voice transformation failed");
    }
  };

  const handleVoiceTransformRef = useRef(handleVoiceTransform);
  handleVoiceTransformRef.current = handleVoiceTransform;
  const autoAppliedVoiceTrackRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = currentAudio;
    const audioId = audio?.audioId;
    const trackKey = audio?.naatId ?? audioId;
    if (
      !audio ||
      !audioId ||
      !trackKey ||
      audio.isLocalFile ||
      audio.voiceSourceAudioId ||
      autoAppliedVoiceTrackRef.current === trackKey
    ) {
      return;
    }

    let cancelled = false;
    const applySavedVoicePreset = async () => {
      const savedPreset = await AsyncStorage.getItem(
        voicePresetPreferenceKey(trackKey),
      );
      if (cancelled) return;

      if (!VOICE_PRESETS.includes(savedPreset as VoicePreset)) {
        autoAppliedVoiceTrackRef.current = trackKey;
        return;
      }

      autoAppliedVoiceTrackRef.current = trackKey;
      void handleVoiceTransformRef.current(savedPreset as VoicePreset);
    };

    void applySavedVoicePreset().catch((error) => {
      autoAppliedVoiceTrackRef.current = trackKey;
      console.error("Failed to restore voice tone preference:", error);
    });
    return () => {
      cancelled = true;
    };
  }, [currentAudio]);

  const handlePlayOriginal = async () => {
    const audio = currentAudio;
    const sourceAudioId = audio?.voiceSourceAudioId;
    if (!audio || !sourceAudioId) return;

    setVoicePreset(null);
    await AsyncStorage.removeItem(
      voicePresetPreferenceKey(audio.naatId ?? sourceAudioId),
    );
    await loadAndPlay({
      ...audio,
      audioId: sourceAudioId,
      audioUrl: getVoiceUrl(sourceAudioId),
      voiceSourceAudioId: undefined,
    });
  };

  const handleVoicePresetPress = (preset: VoicePreset) => {
    if (isTransformingVoice) {
      showInfoToast("Please wait for the current transformation to finish.");
      return;
    }

    if (
      currentAudio?.voiceSourceAudioId &&
      voicePreset === preset
    ) {
      void handlePlayOriginal();
      return;
    }

    void handleVoiceTransform(preset);
  };

  const handleDeleteDownload = () => {
    if (!currentAudio?.audioId) return;

    setShowDeleteConfirmation(true);
  };

  const confirmDeleteDownload = async () => {
    if (!currentAudio?.audioId) return;

    setShowDeleteConfirmation(false);
    try {
      await audioDownloadService.deleteAudio(currentAudio.audioId);
      setIsDownloaded(false);
      showSuccessToast("Download deleted successfully");
    } catch (error) {
      console.error("Failed to delete download:", error);
      showErrorToast("Failed to delete download");
    }
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
    setHasExportedAB(false);
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
    setHasExportedAB(false);
    showSuccessToast("Point B set - Loop active");
  };

  const handleToggleABRepeatMode = () => {
    const newMode = !isABRepeatMode;
    setIsABRepeatMode(newMode);
    if (!newMode) {
      clearABRepeat();
      setHasExportedAB(false);
    }
  };

  const handleExportAB = async () => {
    if (
      hasExportedAB ||
      !currentAudio?.audioId ||
      abRepeatPointA === null ||
      abRepeatPointB === null
    ) {
      return;
    }

    try {
      setIsExportingAB(true);
      const result = await appwriteService.exportABAudio(
        currentAudio.audioId,
        abRepeatPointA,
        abRepeatPointB,
      );

      if (!result.success || !result.downloadUrl || !result.fileId) {
        throw new Error(result.error || "A/B export failed");
      }

      await audioDownloadService.downloadExportedAudio(
        result.downloadUrl,
        result.fileId,
        `${currentAudio.title} (A-B)`,
        result.duration || Math.floor((abRepeatPointB - abRepeatPointA) / 1000),
        currentAudio.channelName || "Unknown Channel",
        currentAudio.views || 0,
        currentAudio.thumbnailUrl,
        currentAudio.audioId,
        abRepeatPointA,
        abRepeatPointB,
      );
      setHasExportedAB(true);
      showSuccessToast("A/B audio saved to Downloads");
    } catch (error) {
      console.error("A/B export failed:", error);
      showErrorToast(
        error instanceof Error ? error.message : "A/B export failed",
      );
    } finally {
      setIsExportingAB(false);
    }
  };

  const bothPointsSet = abRepeatPointA !== null && abRepeatPointB !== null;

  if (!currentAudio) return null;

  const canDownload = currentAudio.audioId && !currentAudio.isLocalFile;
  const showDownloadButton = canDownload || isDownloaded;

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background.primary}
      />

      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <SafeAreaView
          edges={["top", "bottom"]}
          style={{
            flex: 1,
            paddingTop: topInset,
            paddingBottom: bottomInset,
          }}
        >
          {isDesktopWeb ? (
            <View
              style={[
                styles.header,
                styles.headerDesktopWeb,
                styles.headerDesktopWebPosition,
              ]}
            >
              <TouchableOpacity
                onPress={onBack}
                style={styles.headerButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>

              <View style={styles.headerActions}>
                {naatId && onFavoritePress && (
                  <TouchableOpacity
                    onPress={onFavoritePress}
                    style={styles.headerButton}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isFavorite ? "Remove from favorites" : "Add to favorites"
                    }
                  >
                    <Ionicons
                      name={isFavorite ? "heart" : "heart-outline"}
                      size={22}
                      color={
                        isFavorite
                          ? colors.accent.error
                          : colors.text.secondary
                      }
                    />
                  </TouchableOpacity>
                )}
                {currentAudio.youtubeId && onSwitchToVideo && (
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
            </View>
          ) : (
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
          )}

          {showOptionsMenu && (
            <>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setShowOptionsMenu(false)}
                style={styles.menuOverlay}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              />

              <View
                style={[
                  styles.menuContainer,
                  { top: topInset + 52, backgroundColor: colors.background.secondary },
                ]}
              >
                {showDownloadButton && (
                  <TouchableOpacity
                    onPress={() => {
                      setShowOptionsMenu(false);
                      if (isDownloaded) {
                        handleDeleteDownload();
                      } else if (isDownloading) {
                        showInfoToast(
                          `Downloading... ${Math.round(downloadProgress * 100)}%`,
                        );
                      } else {
                        handleDownload();
                      }
                    }}
                    style={menuItemStyle}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: colors.background.tertiary }]}>
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
                      <Text style={[styles.menuItemText, { color: colors.text.primary }] }>
                        {isDownloaded
                          ? "Delete Download"
                          : isDownloading
                            ? "Downloading..."
                            : "Download"}
                      </Text>
                      {isDownloading && (
                        <Text style={[styles.menuItemSubtext, { color: colors.text.secondary }] }>
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
                  style={menuItemStyle}
                >
                  <View style={[styles.menuItemIcon, { backgroundColor: colors.background.tertiary }]}>
                    <Ionicons
                      name="arrow-redo-outline"
                      size={20}
                      color={colors.text.secondary}
                    />
                  </View>
                  <Text style={[styles.menuItemText, { color: colors.text.primary }]}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => void handleVoiceTransform("subtle")}
                  style={[...menuItemStyle, { borderBottomWidth: 0 }]}
                >
                  <View style={[styles.menuItemIcon, { backgroundColor: colors.background.tertiary }]}>
                    <Ionicons
                      name="sparkles-outline"
                      size={20}
                      color={colors.accent.tabActive}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.menuItemText, { color: colors.text.primary }]}>Voice tone</Text>
                    <Text style={[styles.menuItemSubtext, { color: colors.text.secondary }] }>
                      {isTransformingVoice
                        ? "Processing..."
                        : voicePreset
                          ? `${getVoicePresetLabel(voicePreset)} selected`
                          : "Choose a voice tone"}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.voicePresetRow}>
                  {(["subtle", "younger", "high"] as VoicePreset[]).map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => handleVoicePresetPress(preset)}
                      style={[
                        styles.voicePresetButton,
                        { backgroundColor: colors.background.tertiary },
                        voicePreset === preset && {
                          backgroundColor: colors.accent.tabActive,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.voicePresetText,
                          { color: colors.text.primary },
                          voicePreset === preset && { color: colors.text.inverse },
                        ]}
                      >
                        {getVoicePresetLabel(preset)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => {
                    toggleRepeat();
                    setShowOptionsMenu(false);
                  }}
                  style={menuItemStyle}
                >
                  <View
                    style={[
                      styles.menuItemIcon,
                      { backgroundColor: colors.background.tertiary },
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
                       { color: colors.text.primary },
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
                  style={menuItemStyle}
                >
                  <View
                    style={[
                      styles.menuItemIcon,
                      { backgroundColor: colors.background.tertiary },
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
                       { color: colors.text.primary },
                      isAutoplayEnabled && { color: colors.accent.secondary },
                    ]}
                  >
                    Autoplay
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    handleToggleABRepeatMode();
                    setShowOptionsMenu(false);
                  }}
                  style={styles.menuItemLast}
                >
                  <View
                    style={[
                      styles.menuItemIcon,
                      { backgroundColor: colors.background.tertiary },
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
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                         styles.menuItemText,
                         { color: colors.text.primary },
                        isABRepeatMode && { color: colors.accent.primary },
                      ]}
                    >
                      A/B Repeat
                    </Text>
                    {bothPointsSet && (
                      <Text style={[styles.menuItemSubtext, { color: colors.text.secondary }]}>Loop active</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}

          {showDeleteConfirmation && (
            <View style={styles.confirmationOverlay}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setShowDeleteConfirmation(false)}
                style={StyleSheet.absoluteFill}
                accessibilityRole="button"
                accessibilityLabel="Close delete confirmation"
              />
              <View style={[styles.confirmationCard, { backgroundColor: colors.background.secondary }]}>
                <Text style={styles.confirmationTitle}>Delete Download?</Text>
                <Text style={styles.confirmationMessage}>
                  Are you sure you want to delete this downloaded audio?
                </Text>
                <View style={styles.confirmationActions}>
                  <TouchableOpacity
                    onPress={() => setShowDeleteConfirmation(false)}
                    style={[styles.confirmationCancelButton, { backgroundColor: colors.background.tertiary }]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.confirmationCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void confirmDeleteDownload()}
                    style={styles.confirmationDeleteButton}
                    accessibilityRole="button"
                  >
                    <Text style={styles.confirmationDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
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
              <View style={[styles.artworkArea, isDesktopWeb && styles.artworkAreaDesktopWeb]}>
                <View style={styles.artworkContainer}>
                  <View
                    style={[
                      styles.artworkShadow,
                      isDesktopWeb && styles.artworkShadowDesktopWeb,
                    ]}
                  >
                    <Image
                      source={{ uri: currentAudio.thumbnailUrl }}
                      style={styles.artwork}
                      contentFit="cover"
                      transition={300}
                      cachePolicy="memory-disk"
                    />
                  </View>
                </View>

                <View
                  style={[
                    styles.infoSection,
                    isDesktopWeb && styles.infoSectionDesktopWeb,
                  ]}
                >
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.title,
                      { color: colors.text.primary },
                      isDesktopWeb && styles.titleDesktopWeb,
                    ]}
                  >
                    {currentAudio.title}
                  </Text>
                  {currentAudio.voiceSourceAudioId && voicePreset && !isDesktopWeb && (
                    <View
                      style={[
                        styles.voiceVariantIndicator,
                        isDesktopWeb && styles.voiceVariantIndicatorDesktopWeb,
                      ]}
                    >
                      <Text style={styles.voiceVariantLabel}>
                        {getVoicePresetLabel(voicePreset)} tone
                      </Text>
                      <TouchableOpacity
                        onPress={() => void handlePlayOriginal()}
                        accessibilityRole="button"
                        accessibilityLabel="Play original audio"
                        activeOpacity={0.7}
                        style={styles.originalButton}
                      >
                        <Text style={styles.originalButtonText}>Original</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.controlsArea}>
                <View
                  style={[
                    styles.progressSection,
                    isDesktopWeb && styles.progressSectionDesktopWeb,
                  ]}
                >
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
                  {isDesktopWeb && currentAudio.voiceSourceAudioId && voicePreset && (
                    <View
                      style={[
                        styles.voiceVariantIndicator,
                        styles.voiceVariantIndicatorDesktopWeb,
                        styles.voiceVariantIndicatorTransport,
                      ]}
                    >
                      <Text style={styles.voiceVariantLabel}>
                        {getVoicePresetLabel(voicePreset)} tone
                      </Text>
                      <TouchableOpacity
                        onPress={() => void handlePlayOriginal()}
                        accessibilityRole="button"
                        accessibilityLabel="Play original audio"
                        activeOpacity={0.7}
                        style={styles.originalButton}
                      >
                        <Text style={styles.originalButtonText}>Original</Text>
                      </TouchableOpacity>
                    </View>
                  )}
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

                {isWeb && !isDesktopWeb && (
                  <View style={styles.volumeControl}>
                    <Ionicons
                      name={volume > 0 ? "volume-high" : "volume-mute"}
                      size={18}
                      color={colors.text.secondary}
                    />
                    <Slider
                      style={styles.volumeSlider}
                      minimumValue={0}
                      maximumValue={1}
                      value={volume}
                      onValueChange={(nextVolume) => {
                        void setVolume(nextVolume);
                      }}
                      minimumTrackTintColor={colors.accent.primary}
                      maximumTrackTintColor={colors.background.elevated}
                      thumbTintColor={colors.accent.primary}
                      accessibilityLabel="Volume"
                    />
                  </View>
                )}
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

              {bothPointsSet && (
                <TouchableOpacity
                  onPress={() => void handleExportAB()}
                  style={styles.abExportButton}
                  disabled={isExportingAB || hasExportedAB}
                  accessibilityRole="button"
                  accessibilityLabel="Export A/B audio"
                >
                  <Ionicons
                    name={
                      isExportingAB
                        ? "hourglass"
                        : hasExportedAB
                          ? "checkmark-circle"
                          : "download-outline"
                    }
                    size={18}
                    color={colors.background.primary}
                  />
                  <Text style={styles.abExportButtonText}>
                    {isExportingAB
                      ? "Exporting..."
                      : hasExportedAB
                        ? "A/B Audio Saved"
                        : "Export A/B Audio"}
                  </Text>
                </TouchableOpacity>
              )}

              {isDesktopWeb && (
                <View style={styles.desktopVolumeControl}>
                  <Ionicons
                    name={volume > 0 ? "volume-high" : "volume-mute"}
                    size={18}
                    color={colors.text.secondary}
                  />
                  <View style={styles.desktopVolumeSliderFrame}>
                    <WebVolumeSlider
                      value={volume}
                      onChange={(nextVolume) => {
                        void setVolume(nextVolume);
                      }}
                    />
                  </View>
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
  headerDesktopWeb: {
    position: "absolute",
    left: "18%",
    right: "10%",
    zIndex: 10,
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  headerDesktopWebPosition: {
    top: 20,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  confirmationOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 24,
  },
  confirmationCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    backgroundColor: colors.background.secondary,
    ...shadows.lg,
  },
  confirmationTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  confirmationMessage: {
    marginTop: 8,
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmationActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
  confirmationCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background.tertiary,
  },
  confirmationCancelText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  confirmationDeleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.accent.error,
  },
  confirmationDeleteText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.menuDivider,
  },
  menuItemLast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  voicePresetRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  voicePresetButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 8,
    backgroundColor: colors.background.tertiary,
  },
  voicePresetText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  voiceProgressTrack: {
    height: 4,
    overflow: "hidden",
    borderRadius: 2,
    marginTop: 6,
    backgroundColor: colors.background.tertiary,
  },
  voiceProgressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.accent.tabActive,
  },
  voiceTransformBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.secondary,
  },
  voiceTransformBannerIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: colors.background.elevated,
  },
  voiceTransformBannerContent: {
    flex: 1,
  },
  voiceTransformBannerTitle: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  voiceTransformBannerSubtext: {
    marginTop: 2,
    color: colors.text.tertiary,
    fontSize: 11,
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
  artworkAreaDesktopWeb: {
    justifyContent: "flex-start",
    marginTop: -52,
    paddingTop: 12,
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
  artworkShadowDesktopWeb: {
    width: "60%",
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
  infoSectionDesktopWeb: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleDesktopWeb: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
    textAlign: "center",
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  voiceVariantIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  voiceVariantIndicatorDesktopWeb: {
    flexDirection: "row",
    marginTop: 0,
    marginLeft: 16,
  },
  voiceVariantIndicatorTransport: {
    position: "absolute",
    right: "25%",
    top: 0,
    bottom: 0,
    marginLeft: 0,
    justifyContent: "center",
  },
  voiceVariantLabel: {
    color: colors.accent.tabActive,
    fontSize: 13,
    fontWeight: "600",
  },
  originalButton: {
    borderColor: colors.accent.tabActive,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  originalButtonText: {
    color: colors.accent.tabActive,
    fontSize: 12,
    fontWeight: "600",
  },

  progressSection: {
    width: "100%",
    marginBottom: 4,
  },
  progressSectionDesktopWeb: {
    width: "60%",
    alignSelf: "center",
  },
  controlsArea: {
    paddingBottom: 8,
  },
  volumeControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  volumeSlider: {
    flex: 1,
    height: 32,
  },
  desktopVolumeControl: {
    position: "absolute",
    top: 0,
    right: "18%",
    bottom: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 2,
  },
  desktopVolumeSliderFrame: {
    width: 32,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
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
    position: "relative",
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
  abExportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.accent.primary,
  },
  abExportButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});

export default FullPlayerModal;
