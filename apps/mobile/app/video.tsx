import { colors, shadows } from "@/constants/theme";
import { AudioMetadata, useAudioPlayer } from "@/contexts/AudioContext";
import { useVideoPlayer } from "@/contexts/VideoContext";
import { appwriteService } from "@/services/appwrite";
import { audioDownloadService } from "@/services/audioDownload";
import { storageService } from "@/services/storage";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import YoutubePlayer from "react-native-youtube-iframe";

export default function VideoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    videoUrl: string;
    title?: string;
    channelName?: string;
    thumbnailUrl?: string;
    youtubeId?: string;
    audioId?: string;
    isFallback?: string;
  }>();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [audioLoading, setAudioLoading] = React.useState(false);

  // Get contexts
  const { loadAndPlay } = useAudioPlayer();
  const {
    loadVideo,
    clearVideo,
    setPlaying,
    setPosition: setContextPosition,
    setDuration: setContextDuration,
    handleVideoEnd,
    isRepeatEnabled,
    toggleRepeat,
  } = useVideoPlayer();

  // Local video playback state (for UI)
  const [videoPlaying, setVideoPlaying] = React.useState(false);
  const [videoDuration, setVideoDuration] = React.useState(0);
  const [videoPosition, setVideoPosition] = React.useState(0);
  const playerRef = React.useRef<any>(null);

  // Parse params
  const videoUrl = params.videoUrl;
  const title = params.title;
  const channelName = params.channelName;
  const thumbnailUrl = params.thumbnailUrl;
  const propYoutubeId = params.youtubeId;
  const propAudioId = params.audioId;
  const isFallback = params.isFallback === "true";

  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string): string => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : "";
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const videoId = getYouTubeId(videoUrl);

  // Load video on mount and save video preference
  React.useEffect(() => {
    setIsLoading(true);
    setVideoPosition(0);
    setVideoDuration(0);
    setVideoPlaying(false);

    // Load video into context
    if (title && channelName && thumbnailUrl) {
      loadVideo({
        videoUrl,
        videoId: getYouTubeId(videoUrl),
        title,
        channelName,
        thumbnailUrl,
        youtubeId: propYoutubeId,
        audioId: propAudioId,
      });
    }

    // Only save video mode preference if this is NOT a fallback
    if (!isFallback) {
      storageService.savePlaybackMode("video").catch((error) => {
        console.error("Failed to save video mode preference:", error);
      });
    }

    // Cleanup on unmount
    return () => {
      clearVideo();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch to audio mode - loads audio via AudioContext and navigates back
  const switchToAudio = async () => {
    if (!propAudioId) {
      Alert.alert("Audio Not Available", "No audio ID provided.", [
        { text: "OK" },
      ]);
      return;
    }

    try {
      setAudioLoading(true);

      // Check if audio is downloaded first
      let audioUrl: string;
      let isLocalFile = false;

      const downloaded = await audioDownloadService.isDownloaded(propAudioId);

      if (downloaded) {
        // Use local file
        audioUrl = audioDownloadService.getLocalPath(propAudioId);
        isLocalFile = true;
      } else {
        // Fetch from storage
        const response = await appwriteService.getAudioUrl(propAudioId);

        if (response.success && response.audioUrl) {
          audioUrl = response.audioUrl;
        } else {
          const errorMessage =
            response.error || "Audio not available for this naat.";
          Alert.alert("Audio Not Available", errorMessage, [{ text: "OK" }]);
          setAudioLoading(false);
          return;
        }
      }

      // Load audio via AudioContext
      const audioMetadata: AudioMetadata = {
        audioUrl,
        title: title || "Unknown Title",
        channelName: channelName || "Unknown Channel",
        thumbnailUrl: thumbnailUrl || "",
        isLocalFile,
        audioId: propAudioId,
        youtubeId: propYoutubeId,
      };

      await loadAndPlay(audioMetadata);

      // Save preference
      await storageService.savePlaybackMode("audio");
      setAudioLoading(false);

      // Navigate back - audio will continue playing via MiniPlayer
      router.back();
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load audio");
      Alert.alert("Audio Error", error.message, [{ text: "OK" }]);
      setAudioLoading(false);
    }
  };

  // Handle fullscreen changes
  const handleFullscreenChange = async (isFullscreen: boolean) => {
    setIsFullscreen(isFullscreen);

    if (isFullscreen) {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      );
    } else {
      await ScreenOrientation.unlockAsync();
    }
  };

  // Cleanup: unlock orientation when screen unmounts
  React.useEffect(() => {
    return () => {
      if (isFullscreen) {
        ScreenOrientation.unlockAsync();
      }
    };
  }, [isFullscreen]);

  // Update video position periodically
  React.useEffect(() => {
    const interval = setInterval(async () => {
      if (playerRef.current) {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          setVideoPosition(currentTime);
          // Update context position
          setContextPosition(currentTime);
        } catch {
          // Ignore errors
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [setContextPosition]);

  // Handle video state changes
  const onStateChange = React.useCallback(
    (state: string) => {
      if (state === "playing") {
        setVideoPlaying(true);
        setPlaying(true);
      } else if (state === "paused") {
        setVideoPlaying(false);
        setPlaying(false);
      } else if (state === "ended") {
        setVideoPlaying(false);
        setPlaying(false);

        // Handle repeat manually
        if (isRepeatEnabled && playerRef.current) {
          console.log("[VideoScreen] Repeating video");
          // Seek to start and play again
          setTimeout(async () => {
            try {
              await playerRef.current.seekTo(0, true);
              setVideoPlaying(true);
              setPlaying(true);
            } catch (error) {
              console.error("[VideoScreen] Error repeating video:", error);
            }
          }, 100); // Small delay to ensure video is ready
        } else {
          // Notify context that video ended (for autoplay)
          handleVideoEnd();
        }
      }
    },
    [setPlaying, handleVideoEnd, isRepeatEnabled],
  );

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
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background.primary}
      />

      <SafeAreaView edges={["bottom"]} className="flex-1 bg-black">
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
                  <Pressable
                    onPress={() => router.back()}
                    className="mr-4 p-2 -ml-2"
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                  >
                    <Ionicons
                      name="arrow-back"
                      size={24}
                      color={colors.text.primary}
                    />
                  </Pressable>

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
                </View>
              </View>
            </SafeAreaView>

            {/* Video Player */}
            <View className="flex-1 bg-black">
              <View className="relative flex-1">
                <YoutubePlayer
                  ref={playerRef}
                  height={300}
                  videoId={videoId}
                  play={videoPlaying}
                  onReady={() => {
                    setIsLoading(false);
                    if (playerRef.current) {
                      playerRef.current
                        .getDuration()
                        .then((duration: number) => {
                          setVideoDuration(duration);
                          // Update context duration
                          setContextDuration(duration);
                        });
                    }
                  }}
                  onChangeState={onStateChange}
                  onFullScreenChange={handleFullscreenChange}
                  onError={() => {
                    setIsLoading(false);
                    Alert.alert(
                      "Video Error",
                      "Unable to load video. Please check your internet connection and try again.",
                      [{ text: "OK" }],
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

                {/* Repeat Button */}
                <View className="mb-4 flex-row items-center justify-center">
                  <Pressable
                    onPress={toggleRepeat}
                    className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-neutral-800"
                    accessibilityRole="button"
                    accessibilityLabel={
                      isRepeatEnabled ? "Repeat enabled" : "Repeat disabled"
                    }
                  >
                    <Ionicons
                      name="repeat"
                      size={20}
                      color={isRepeatEnabled ? colors.accent.primary : "white"}
                    />
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: isRepeatEnabled
                          ? colors.accent.primary
                          : "white",
                      }}
                    >
                      Repeat
                    </Text>
                  </Pressable>
                </View>

                {/* Play as Audio Button */}
                <Pressable
                  onPress={switchToAudio}
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
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}
