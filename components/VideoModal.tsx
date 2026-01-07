import AudioPlayer from "@/components/AudioPlayer";
import { appwriteService } from "@/services/appwrite";
import { storageService } from "@/services/storage";
import { VideoPlayerProps } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

interface VideoModalProps extends VideoPlayerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  channelName?: string;
  thumbnailUrl?: string;
  youtubeId?: string;
}

const VideoModal: React.FC<VideoModalProps> = ({
  visible,
  onClose,
  videoUrl,
  title,
  channelName,
  thumbnailUrl,
  youtubeId: propYoutubeId,
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Playback mode state
  const [mode, setMode] = React.useState<"video" | "audio">("video");
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [audioLoading, setAudioLoading] = React.useState(false);
  const [audioError, setAudioError] = React.useState<Error | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [refreshAttempts, setRefreshAttempts] = React.useState(0);
  const [refreshFailed, setRefreshFailed] = React.useState(false);

  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string): string => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : "";
  };

  const videoId = getYouTubeId(videoUrl);

  // Reset loading state when modal opens
  React.useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setAudioError(null);
      setRefreshAttempts(0);
      setRefreshFailed(false);

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
            const ytId = propYoutubeId || getYouTubeId(videoUrl);
            const response = await appwriteService.getAudioUrl(ytId);

            if (response.success && response.audioUrl) {
              setAudioUrl(response.audioUrl);
            } else {
              // If audio extraction fails, fall back to video mode
              setMode("video");
            }
            setAudioLoading(false);
          }
        } catch (_error) {
          // On error, default to video mode
          setMode("video");
          setAudioLoading(false);
        }
      };

      loadPreference();
    }
  }, [visible, propYoutubeId, videoUrl]);

  // Switch between video and audio modes
  const switchMode = async (newMode: "video" | "audio") => {
    if (newMode === mode) return;

    try {
      // If switching to audio mode, fetch audio URL
      if (newMode === "audio" && !audioUrl) {
        setAudioLoading(true);
        setAudioError(null);

        const ytId = propYoutubeId || getYouTubeId(videoUrl);
        const response = await appwriteService.getAudioUrl(ytId);

        if (response.success && response.audioUrl) {
          setAudioUrl(response.audioUrl);
          setMode(newMode);
          // Save preference immediately after successful mode change
          await storageService.savePlaybackMode(newMode);
        } else {
          throw new Error(response.error || "Failed to extract audio URL");
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
      // Stay in current mode on error
    } finally {
      setAudioLoading(false);
    }
  };

  // Handle position changes from player
  const handlePositionChange = (_position: number) => {
    // Position tracking can be implemented here if needed for future features
  };

  // Refresh audio URL when it expires
  const refreshAudioUrl = async () => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes

    setIsRefreshing(true);
    setAudioError(null);
    setRefreshFailed(false);

    const maxRetries = 2;
    let attempts = refreshAttempts;

    try {
      const ytId = propYoutubeId || getYouTubeId(videoUrl);
      const response = await appwriteService.getAudioUrl(ytId);

      if (response.success && response.audioUrl) {
        setAudioUrl(response.audioUrl);
        setRefreshAttempts(0); // Reset attempts on success
        setRefreshFailed(false);
        // Position will be preserved by the AudioPlayer component
      } else {
        throw new Error(response.error || "Failed to refresh audio URL");
      }
    } catch (_err) {
      attempts += 1;
      setRefreshAttempts(attempts);

      if (attempts >= maxRetries) {
        // Max retries reached, mark as failed
        setRefreshFailed(true);
        setAudioError(
          new Error(
            "Unable to refresh audio after multiple attempts. Please try switching to video mode."
          )
        );
      } else {
        // Retry after a short delay
        setTimeout(() => {
          refreshAudioUrl();
        }, 2000);
        return; // Don't set isRefreshing to false yet
      }
    } finally {
      if (refreshAttempts >= maxRetries || refreshFailed) {
        setIsRefreshing(false);
      }
    }
  };

  // Handle URL expiration from AudioPlayer
  const handleUrlExpired = () => {
    refreshAudioUrl();
  };

  // Handle audio playback errors
  const handleAudioError = (error: Error) => {
    setAudioError(error);
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

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />

      {/* Backdrop with TouchableWithoutFeedback behavior */}
      <View className="flex-1 bg-black/95">
        {/* Top backdrop area - tappable to close */}
        <Pressable className="flex-1" onPress={onClose} />

        {/* Modal Content Container */}
        <View className="px-4">
          <View
            className="bg-neutral-900 rounded-2xl overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            {/* Header */}
            <View className="bg-neutral-800 px-5 py-4 border-b border-neutral-700">
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

                {/* Mode Toggle Button */}
                <Pressable
                  onPress={() =>
                    switchMode(mode === "video" ? "audio" : "video")
                  }
                  className="mr-3 rounded-full bg-neutral-700 p-2 active:bg-neutral-600"
                  accessibilityLabel={`Switch to ${mode === "video" ? "audio" : "video"} mode`}
                  accessibilityRole="button"
                  disabled={audioLoading}
                >
                  {audioLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons
                      name={mode === "video" ? "musical-notes" : "videocam"}
                      size={20}
                      color="#ffffff"
                    />
                  )}
                </Pressable>

                <Pressable
                  onPress={onClose}
                  className="rounded-full bg-neutral-700 p-2 active:bg-neutral-600"
                  accessibilityLabel="Close video"
                  accessibilityRole="button"
                >
                  <Text className="text-xl text-white font-bold">✕</Text>
                </Pressable>
              </View>
            </View>

            {/* Player - conditionally render based on mode */}
            {mode === "video" ? (
              <View className="relative bg-black" style={{ height: 250 }}>
                <YoutubePlayer
                  height={250}
                  videoId={videoId}
                  play={false}
                  onReady={() => setIsLoading(false)}
                  onFullScreenChange={handleFullscreenChange}
                  webViewStyle={{ opacity: isLoading ? 0 : 1 }}
                  initialPlayerParams={{
                    controls: true,
                    modestbranding: true,
                    rel: false,
                  }}
                />

                {isLoading && (
                  <View className="absolute inset-0 items-center justify-center bg-black">
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text className="mt-3 text-sm text-neutral-400">
                      Loading video...
                    </Text>
                  </View>
                )}
              </View>
            ) : audioUrl ? (
              <View style={{ height: 500 }}>
                {isRefreshing && (
                  <View className="absolute inset-0 z-10 items-center justify-center bg-black/80">
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text className="mt-3 text-sm text-neutral-400">
                      Refreshing audio...
                    </Text>
                  </View>
                )}
                <AudioPlayer
                  audioUrl={audioUrl}
                  title={title || ""}
                  channelName={channelName || "Baghdadi Sound & Video"}
                  thumbnailUrl={thumbnailUrl || ""}
                  onError={handleAudioError}
                  onPositionChange={handlePositionChange}
                  onUrlExpired={handleUrlExpired}
                />
              </View>
            ) : (
              <View className="bg-black" style={{ height: 250 }}>
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text className="mt-3 text-sm text-neutral-400">
                    Loading audio...
                  </Text>
                </View>
              </View>
            )}

            {/* Show audio error if present */}
            {audioError && mode === "audio" && (
              <View className="bg-red-500/90 p-4">
                <Text className="text-center text-white font-semibold">
                  {audioError.message}
                </Text>

                {/* Show different actions based on error type */}
                <View className="mt-3 flex-row justify-center space-x-2">
                  {refreshFailed ? (
                    <>
                      <Pressable
                        onPress={() => {
                          setRefreshFailed(false);
                          setRefreshAttempts(0);
                          refreshAudioUrl();
                        }}
                        className="flex-1 mr-2 rounded-lg bg-white p-2"
                      >
                        <Text className="text-center text-red-500 font-semibold">
                          Retry
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => switchMode("video")}
                        className="flex-1 ml-2 rounded-lg bg-white p-2"
                      >
                        <Text className="text-center text-red-500 font-semibold">
                          Switch to Video
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => switchMode("video")}
                      className="rounded-lg bg-white p-2"
                    >
                      <Text className="text-center text-red-500 font-semibold">
                        Switch to Video
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Close hint */}
          <Pressable onPress={onClose}>
            <Text className="text-center text-sm text-neutral-500 mt-6 mb-4">
              Tap outside to close
            </Text>
          </Pressable>
        </View>

        {/* Bottom backdrop area - tappable to close */}
        <Pressable className="flex-1" onPress={onClose} />
      </View>
    </Modal>
  );
};

export default VideoModal;
