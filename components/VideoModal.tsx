import AudioPlayer from "@/components/AudioPlayer";
import { colors, shadows } from "@/constants/theme";
import { appwriteService } from "@/services/appwrite";
import { audioDownloadService } from "@/services/audioDownload";
import { storageService } from "@/services/storage";
import { VideoPlayerProps } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ScreenOrientation from "expo-screen-orientation";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import YoutubePlayer from "react-native-youtube-iframe";

interface VideoModalProps extends VideoPlayerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  channelName?: string;
  thumbnailUrl?: string;
  youtubeId?: string;
  audioId?: string; // Appwrite Storage audio file ID
}

const VideoModal: React.FC<VideoModalProps> = ({
  visible,
  onClose,
  videoUrl,
  title,
  channelName,
  thumbnailUrl,
  youtubeId: propYoutubeId,
  audioId: propAudioId,
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Playback mode state
  const [mode, setMode] = React.useState<"video" | "audio">("video");
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [audioLoading, setAudioLoading] = React.useState(false);
  const [audioError, setAudioError] = React.useState<Error | null>(null);
  const [isLocalFile, setIsLocalFile] = React.useState(false);

  // Download state
  const [isDownloaded, setIsDownloaded] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);

  // Video playback state
  const [videoPlaying, setVideoPlaying] = React.useState(false);
  const [videoDuration, setVideoDuration] = React.useState(0);
  const [videoPosition, setVideoPosition] = React.useState(0);
  const playerRef = React.useRef<any>(null);

  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string): string => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : "";
  };

  // Format milliseconds to MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const videoId = getYouTubeId(videoUrl);

  // Reset loading state when modal opens
  React.useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setAudioError(null);
      setVideoPosition(0);
      setVideoDuration(0);
      setVideoPlaying(false);

      // Load saved playback mode preference
      const loadPreference = async () => {
        try {
          const savedMode = await storageService.loadPlaybackMode();
          // Default to video mode if no preference exists
          const initialMode = savedMode || "video";
          setMode(initialMode);

          // If saved mode is audio, fetch audio URL
          if (initialMode === "audio") {
            setAudioLoading(true);

            // Check if audio is downloaded first
            if (propAudioId) {
              const downloaded =
                await audioDownloadService.isDownloaded(propAudioId);
              setIsDownloaded(downloaded);

              if (downloaded) {
                // Use local file
                const localPath =
                  audioDownloadService.getLocalPath(propAudioId);
                setAudioUrl(localPath);
                setIsLocalFile(true);
                setAudioLoading(false);
                return;
              }
            }

            // Otherwise fetch from storage
            const response = await appwriteService.getAudioUrl(propAudioId);

            if (response.success && response.audioUrl) {
              setAudioUrl(response.audioUrl);
              setIsLocalFile(false);
            } else {
              // If audio not available, fall back to video mode
              setMode("video");
              Alert.alert(
                "Audio Not Available",
                "Audio version is not available for this naat. Playing video instead.",
                [{ text: "OK" }]
              );
            }
            setAudioLoading(false);
          }
        } catch {
          // On error, default to video mode
          setMode("video");
          setAudioLoading(false);
          Alert.alert(
            "Audio Error",
            "Unable to load audio. Playing video instead.",
            [{ text: "OK" }]
          );
        }
      };

      loadPreference();
    }
  }, [visible, propAudioId]);

  // Switch between video and audio modes
  const switchMode = async (newMode: "video" | "audio") => {
    if (newMode === mode) return;

    try {
      // If switching to audio mode, fetch audio URL
      if (newMode === "audio" && !audioUrl) {
        setAudioLoading(true);
        setAudioError(null);

        // Check if audio is downloaded first
        if (propAudioId) {
          const downloaded =
            await audioDownloadService.isDownloaded(propAudioId);
          setIsDownloaded(downloaded);

          if (downloaded) {
            // Use local file
            const localPath = audioDownloadService.getLocalPath(propAudioId);
            setAudioUrl(localPath);
            setIsLocalFile(true);
            setMode(newMode);
            await storageService.savePlaybackMode(newMode);
            setAudioLoading(false);
            return;
          }
        }

        // Otherwise fetch from storage
        const response = await appwriteService.getAudioUrl(propAudioId);

        if (response.success && response.audioUrl) {
          setAudioUrl(response.audioUrl);
          setIsLocalFile(false);
          setMode(newMode);
          // Save preference immediately after successful mode change
          await storageService.savePlaybackMode(newMode);
        } else {
          const errorMessage =
            response.error || "Audio not available for this naat.";
          Alert.alert("Audio Not Available", errorMessage, [{ text: "OK" }]);
          throw new Error(errorMessage);
        }
      } else {
        // Switch to video or audio (if URL already exists)
        setMode(newMode);
        // Save preference immediately after mode change
        await storageService.savePlaybackMode(newMode);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to switch mode");
      setAudioError(error);

      // Show alert for audio errors
      Alert.alert("Audio Error", error.message, [{ text: "OK" }]);
      // Stay in current mode on error
    } finally {
      setAudioLoading(false);
    }
  };

  // Handle position changes from player
  const handlePositionChange = (_position: number) => {
    // Position tracking can be implemented here if needed for future features
  };

  // Handle audio playback errors
  const handleAudioError = (error: Error) => {
    setAudioError(error);
  };

  // Download audio
  const handleDownload = async () => {
    if (!propAudioId || !audioUrl || isLocalFile) return;

    // Show download started alert
    Alert.alert(
      "Download Started",
      "Audio is downloading in the background. You can continue listening.",
      [{ text: "OK" }]
    );

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      await audioDownloadService.downloadAudio(
        propAudioId,
        audioUrl,
        propYoutubeId || "",
        title || "",
        (progress) => {
          setDownloadProgress(progress.progress);
        }
      );

      setIsDownloaded(true);

      // Show success notification
      Alert.alert(
        "Download Complete",
        "Audio downloaded successfully and ready for offline playback.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Download failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Download failed";

      Alert.alert("Download Failed", errorMessage, [{ text: "OK" }]);
    } finally {
      setIsDownloading(false);
    }
  };

  // Delete downloaded audio
  const handleDeleteDownload = async () => {
    if (!propAudioId) return;

    try {
      await audioDownloadService.deleteAudio(propAudioId);
      setIsDownloaded(false);

      // Switch back to streaming
      if (propAudioId) {
        const response = await appwriteService.getAudioUrl(propAudioId);
        if (response.success && response.audioUrl) {
          setAudioUrl(response.audioUrl);
          setIsLocalFile(false);
        }
      }
    } catch (error) {
      console.error("Failed to delete download:", error);
    }
  };

  // Handle fullscreen changes
  const handleFullscreenChange = async (isFullscreen: boolean) => {
    setIsFullscreen(isFullscreen);

    if (isFullscreen) {
      // Lock to landscape when entering fullscreen
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    } else {
      // Unlock orientation when exiting fullscreen
      await ScreenOrientation.unlockAsync();
    }
  };

  // Cleanup: unlock orientation when modal closes
  React.useEffect(() => {
    if (!visible && isFullscreen) {
      ScreenOrientation.unlockAsync();
      setIsFullscreen(false);
    }
  }, [visible, isFullscreen]);

  // Update video position periodically
  React.useEffect(() => {
    if (!visible || mode !== "video") return;

    const interval = setInterval(async () => {
      if (playerRef.current) {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          setVideoPosition(currentTime);
        } catch {
          // Ignore errors
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [visible, mode]);

  // Handle video state changes
  const onStateChange = React.useCallback((state: string) => {
    if (state === "playing") {
      setVideoPlaying(true);
    } else if (state === "paused" || state === "ended") {
      setVideoPlaying(false);
    }
  }, []);

  // Seek to position in video
  const seekToPosition = async (seconds: number) => {
    if (playerRef.current) {
      try {
        await playerRef.current.seekTo(seconds, true);
        setVideoPosition(seconds);
      } catch {
        // Ignore errors
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background.primary}
      />

      {/* Full Height Modal Container */}
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-black">
        {/* Modal Content Container */}
        <View className="flex-1">
          <View
            className="flex-1 bg-neutral-900 overflow-hidden"
            style={shadows.lg}
          >
            {/* Header */}
            <SafeAreaView
              edges={["top"]}
              className="bg-neutral-800 border-b border-neutral-700"
            >
              <View className="px-5 py-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    {title && (
                      <Text
                        className="text-base font-bold text-white leading-tight"
                        numberOfLines={2}
                      >
                        {title}
                      </Text>
                    )}
                    <Text className="text-sm text-neutral-400 mt-1">
                      {channelName || "Baghdadi Sound & Video"}
                    </Text>
                  </View>

                  {/* Switch to Video Button - only show in audio mode */}
                  {mode === "audio" && (
                    <Pressable
                      onPress={() => switchMode("video")}
                      className="rounded-full bg-neutral-700 p-2 active:bg-neutral-600"
                      accessibilityLabel="Switch to video mode"
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="videocam"
                        size={30}
                        color={colors.text.primary}
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            </SafeAreaView>

            {/* Player - conditionally render based on mode */}
            {mode === "video" ? (
              <View className="flex-1 bg-black">
                <View className="relative flex-1">
                  <YoutubePlayer
                    ref={playerRef}
                    height={300}
                    videoId={videoId}
                    play={videoPlaying}
                    onReady={() => {
                      setIsLoading(false);
                      // Get video duration
                      if (playerRef.current) {
                        playerRef.current
                          .getDuration()
                          .then((duration: number) => {
                            setVideoDuration(duration);
                          });
                      }
                    }}
                    onChangeState={onStateChange}
                    onFullScreenChange={handleFullscreenChange}
                    onError={(error: string) => {
                      setIsLoading(false);
                      Alert.alert(
                        "Video Error",
                        "Unable to load video. Please check your internet connection and try again.",
                        [{ text: "OK" }]
                      );
                    }}
                    webViewStyle={{ opacity: isLoading ? 0 : 1 }}
                    initialPlayerParams={{
                      controls: true,
                      modestbranding: true,
                      rel: false,
                    }}
                  />

                  {isLoading && (
                    <View className="absolute inset-0 items-center justify-center bg-black">
                      <ActivityIndicator
                        size="large"
                        color={colors.text.primary}
                      />
                      <Text className="mt-3 text-sm text-neutral-400">
                        Loading video...
                      </Text>
                    </View>
                  )}
                </View>

                {/* Custom Video Controls */}
                <View className="px-6 pb-4 bg-black">
                  {/* Progress Bar */}
                  <View className="mb-4">
                    <Slider
                      style={{ width: "100%", height: 40 }}
                      minimumValue={0}
                      maximumValue={videoDuration}
                      value={videoPosition}
                      onSlidingComplete={seekToPosition}
                      minimumTrackTintColor={colors.accent.primary}
                      maximumTrackTintColor={colors.background.elevated}
                      thumbTintColor={colors.accent.primary}
                    />

                    {/* Time Labels */}
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-neutral-400">
                        {formatTime(videoPosition)}
                      </Text>
                      <Text className="text-sm text-neutral-400">
                        {formatTime(videoDuration)}
                      </Text>
                    </View>
                  </View>

                  {/* Play as Audio Button */}
                  <Pressable
                    onPress={() => switchMode("audio")}
                    disabled={audioLoading}
                    className="flex-row items-center justify-center rounded-2xl px-6 py-4 active:opacity-80"
                    style={{
                      backgroundColor: colors.accent.primary,
                      ...shadows.accent,
                    }}
                    accessibilityLabel="Switch to audio mode"
                    accessibilityRole="button"
                  >
                    {audioLoading ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color={colors.text.primary}
                        />
                        <Text className="ml-3 text-base font-bold text-white">
                          Loading Audio...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name="musical-notes"
                          size={24}
                          color={colors.text.primary}
                        />
                        <Text className="ml-3 text-base font-bold text-white">
                          Play as Audio Only
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : audioUrl ? (
              <View className="flex-1">
                <AudioPlayer
                  audioUrl={audioUrl}
                  title={title || ""}
                  channelName={channelName || "Baghdadi Sound & Video"}
                  thumbnailUrl={thumbnailUrl || ""}
                  onError={handleAudioError}
                  onPositionChange={handlePositionChange}
                  autoPlay={!isDownloading}
                  isLocalFile={isLocalFile}
                  isDownloaded={isDownloaded}
                  isDownloading={isDownloading}
                  downloadProgress={downloadProgress}
                  onDownload={handleDownload}
                  onDeleteDownload={handleDeleteDownload}
                  canDownload={!!propAudioId}
                />
              </View>
            ) : (
              <View className="flex-1 bg-black">
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color={colors.text.primary} />
                  <Text className="mt-3 text-sm text-neutral-400">
                    Loading audio...
                  </Text>
                </View>
              </View>
            )}

            {/* Show audio error if present */}
            {audioError && mode === "audio" && (
              <View
                className="p-4"
                style={{ backgroundColor: colors.accent.error }}
              >
                <Text className="text-center text-white font-semibold">
                  {audioError.message}
                </Text>

                <View className="mt-3 flex-row justify-center">
                  <Pressable
                    onPress={() => switchMode("video")}
                    className="rounded-lg bg-white px-6 py-2"
                  >
                    <Text
                      className="text-center font-semibold"
                      style={{ color: colors.accent.error }}
                    >
                      Switch to Video
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default VideoModal;
