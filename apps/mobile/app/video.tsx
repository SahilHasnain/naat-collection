import Pressable from "@/components/ResponsivePressable";
import { RelatedVideoRow } from "@/components/RelatedVideoRow";
import { features } from "@/config/features";
import { colors, shadows } from "@/constants/theme";
import { AudioMetadata, useAudioPlayer } from "@/contexts/AudioContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { useTheme } from "@/contexts/ThemeContext";
import { useVideoPlayer } from "@/contexts/VideoContext";
import { WEB_MAX_CONTENT_WIDTH } from "@/hooks/useResponsiveColumns";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { appwriteService } from "@/services/appwrite";
import { audioDownloadService } from "@/services/audioDownload";
import { storageService } from "@/services/storage";
import { userProfileService } from "@/services/userProfile";
import type { Naat } from "@/types";
import {
  dedupeRelatedNaats,
  rankRelatedNaats,
  tokenizeTitle,
} from "@/utils/relatedScoring";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
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
    duration?: string;
    youtubeId?: string;
    audioId?: string;
    naatId?: string;
    isFallback?: string;
  }>();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isZoomed, setIsZoomed] = React.useState(false);
  const [fullscreenStartTime, setFullscreenStartTime] = React.useState(0);
  const [audioLoading, setAudioLoading] = React.useState(false);
  const systemBarsTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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
    isAutoplayEnabled,
    toggleAutoplay,
    setAutoplayCallback,
  } = useVideoPlayer();
  const { showTabBar, hideTabBar } = useTabBarVisibility();
  const { resolvedTheme } = useTheme();

  // Video mode is immersive: hide the tab bar while this screen is focused and
  // restore it on the way out.
  useFocusEffect(
    React.useCallback(() => {
      hideTabBar();
      return () => {
        showTabBar();
      };
    }, [hideTabBar, showTabBar]),
  );

  // Local video playback state (for UI)
  const [videoPlaying, setVideoPlaying] = React.useState(false);
  const [videoDuration, setVideoDuration] = React.useState(0);
  const [videoPosition, setVideoPosition] = React.useState(0);
  const playerRef = React.useRef<any>(null);
  const fullscreenPlayerRef = React.useRef<any>(null);

  // Desktop-web layout: constrain content width and keep the player at 16:9.
  const { isWeb, isDesktopWeb } = useResponsiveLayout();
  const windowWidth = useWindowDimensions().width;
  const windowHeight = useWindowDimensions().height;
  const fullscreenPlayerWidth = Math.max(windowWidth, windowHeight);
  const fullscreenPlayerHeight = Math.round((fullscreenPlayerWidth * 9) / 16);
  // Measured on layout; the fallback avoids a zero-height player on first paint.
  const [playerWidth, setPlayerWidth] = React.useState(0);
  const fallbackPlayerWidth = isDesktopWeb
    ? Math.max(windowWidth - 224 - 48 - 404, 320)
    : windowWidth;
  const playerHeight = Math.round(
    ((playerWidth > 0 ? playerWidth : fallbackPlayerWidth) * 9) / 16,
  );

  // Parse params
  const videoUrl = params.videoUrl || "";
  const title = params.title;
  const channelName = params.channelName;
  const thumbnailUrl = params.thumbnailUrl;
  const dbDuration = Number(params.duration || 0);
  const propYoutubeId = params.youtubeId;
  const propAudioId = params.audioId;
  const propNaatId = params.naatId;
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

  // Load video on mount, save video preference, and autoplay
  React.useEffect(() => {
    setIsLoading(true);
    setVideoPosition(0);
    setVideoDuration(dbDuration);
    setContextPosition(0);
    setContextDuration(dbDuration);
    // Start playing immediately (autoplay)
    setVideoPlaying(true);

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

    // Fallback: Clear loading state after 5 seconds if still loading
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.log("[VideoScreen] Loading timeout - clearing loading state");
        setIsLoading(false);
      }
    }, 5000);

    // Cleanup on unmount
    return () => {
      clearTimeout(loadingTimeout);
      clearVideo();
    };
  }, [
    channelName,
    clearVideo,
    isFallback,
    loadVideo,
    propAudioId,
    propYoutubeId,
    setContextDuration,
    setContextPosition,
    thumbnailUrl,
    title,
    dbDuration,
    videoUrl,
  ]);

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
        naatId: propNaatId,
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

  // Handle fullscreen changes from the embedded player.
  const handleFullscreenChange = async (isFullscreen: boolean) => {
    if (isWeb) {
      return;
    }

    if (isFullscreen) {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      );
    } else {
      await ScreenOrientation.unlockAsync();
    }
  };

  const setSystemBarsVisible = async (visible: boolean) => {
    if (Platform.OS !== "android") return;

    try {
      await NavigationBar.setBehaviorAsync(
        visible ? "inset-touch" : "overlay-swipe",
      );
      await NavigationBar.setVisibilityAsync(visible ? "visible" : "hidden");
      StatusBar.setHidden(!visible, "none");
    } catch (error) {
      console.error(
        "[VideoScreen] Failed to update system navigation bar:",
        error,
      );
    }
  };

  const openFullscreen = async () => {
    setFullscreenStartTime(Math.floor(videoPosition));
    setIsZoomed(false);
    setIsFullscreen(true);
    await setSystemBarsVisible(false);
    if (!isWeb) {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      );
    }
  };

  const closeFullscreen = async () => {
    try {
      const currentTime = await fullscreenPlayerRef.current?.getCurrentTime();
      if (typeof currentTime === "number" && Number.isFinite(currentTime)) {
        setVideoPosition(currentTime);
        await playerRef.current?.seekTo(currentTime, true);
      }
    } finally {
      setIsFullscreen(false);
      setIsZoomed(false);
      await setSystemBarsVisible(true);
      if (!isWeb) {
        await ScreenOrientation.unlockAsync();
      }
    }
  };

  // Keep the OS controls explicit in both modes. Android can otherwise retain
  // immersive navigation behavior after the fullscreen modal is dismissed.
  React.useEffect(() => {
    void setSystemBarsVisible(isFullscreen);

    if (Platform.OS !== "android" || !isFullscreen) {
      return () => {
        if (systemBarsTimerRef.current) {
          clearTimeout(systemBarsTimerRef.current);
          systemBarsTimerRef.current = null;
        }
        void setSystemBarsVisible(true);
      };
    }

    const subscription = NavigationBar.addVisibilityListener(
      ({ visibility }) => {
        if (systemBarsTimerRef.current) {
          clearTimeout(systemBarsTimerRef.current);
          systemBarsTimerRef.current = null;
        }

        if (visibility === "visible") {
          systemBarsTimerRef.current = setTimeout(() => {
            void setSystemBarsVisible(false);
            systemBarsTimerRef.current = null;
          }, 5000);
        }
      },
    );

    return () => {
      subscription.remove();
      if (systemBarsTimerRef.current) {
        clearTimeout(systemBarsTimerRef.current);
        systemBarsTimerRef.current = null;
      }
      void setSystemBarsVisible(true);
      if (isFullscreen && !isWeb) {
        ScreenOrientation.unlockAsync();
      }
    };
  }, [isFullscreen, isWeb]);

  React.useEffect(() => {
    if (!isFullscreen) {
      void setSystemBarsVisible(true);
    }
  }, [isFullscreen]);

  // Update video position periodically and check duration
  React.useEffect(() => {
    const interval = setInterval(async () => {
      const activePlayerRef = isFullscreen
        ? fullscreenPlayerRef.current
        : playerRef.current;
      if (activePlayerRef) {
        try {
          const currentTime = await activePlayerRef.getCurrentTime();
          setVideoPosition(currentTime);
          // Update context position
          setContextPosition(currentTime);

          // If duration is still 0, try to get it
          if (dbDuration === 0 && videoDuration === 0) {
            try {
              const duration = await playerRef.current.getDuration();
              if (duration > 0) {
                console.log(
                  "[VideoScreen] Video duration from interval:",
                  duration,
                );
                setVideoDuration(duration);
                setContextDuration(duration);
              }
            } catch (durationError) {
              // Ignore duration errors in interval
            }
          }
        } catch {
          // Ignore errors
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [dbDuration, setContextPosition, videoDuration, setContextDuration]);

  // Handle video state changes
  const onStateChange = React.useCallback(
    (state: string) => {
      // Clear loading state when video starts playing
      if (state === "playing") {
        setIsLoading(false);
        setVideoPlaying(true);
        setPlaying(true);

        // Fallback: Get duration when video starts playing if not already set
        if (dbDuration === 0 && videoDuration === 0 && playerRef.current) {
          setTimeout(async () => {
            try {
              const duration = await playerRef.current.getDuration();
              console.log(
                "[VideoScreen] Video duration from playing state:",
                duration,
              );
              if (duration > 0) {
                setVideoDuration(duration);
                setContextDuration(duration);
              }
            } catch (error) {
              console.error(
                "[VideoScreen] Error getting duration from playing state:",
                error,
              );
            }
          }, 1000);
        }
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
    [
      dbDuration,
      setPlaying,
      handleVideoEnd,
      isRepeatEnabled,
      videoDuration,
      setContextDuration,
    ],
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

  // ── Related content ──────────────────────────────────────────────────────
  const [related, setRelated] = React.useState<Naat[]>([]);
  const [relatedLoading, setRelatedLoading] = React.useState(
    features.showRelatedVideos,
  );
  const [relatedLoadingMore, setRelatedLoadingMore] = React.useState(false);
  const [relatedError, setRelatedError] = React.useState<string | null>(null);
  const [relatedHasMore, setRelatedHasMore] = React.useState(true);
  const [relatedRequestKey, setRelatedRequestKey] = React.useState(0);
  const relatedScrollRef = React.useRef<FlatList<Naat>>(null);
  const relatedOffsets = React.useRef({ popular: 0, latest: 0 });
  const relatedLoadingRef = React.useRef(false);

  // Tapping a related video replaces the route params; reset scroll so the
  // new video starts from the top.
  React.useEffect(() => {
    relatedScrollRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [propNaatId, videoUrl]);

  React.useEffect(() => {
    if (!features.showRelatedVideos) return;

    let cancelled = false;
    relatedOffsets.current = { popular: 0, latest: 0 };
    relatedLoadingRef.current = false;
    setRelated([]);
    setRelatedLoading(true);
    setRelatedLoadingMore(false);
    setRelatedError(null);
    setRelatedHasMore(true);

    const loadRelated = async () => {
      try {
        // Tier 1: title/topic matches plus a small popular fallback. Later
        // pages deliberately broaden into popular/latest long-tail content.
        const searchTokens = tokenizeTitle(title ?? "")
          .sort((a, b) => b.length - a.length)
          .slice(0, 2);
        const [popular, ...searchResults] = await Promise.all([
          appwriteService.getNaats(12, 0, "popular"),
          ...searchTokens.map((token) => appwriteService.searchNaats(token)),
        ]);
        relatedOffsets.current.popular = popular.length;

        const [profile, watchTimestamps] = await Promise.all([
          userProfileService.getProfile(),
          storageService.getWatchHistoryTimestamps(),
        ]);

        if (cancelled) return;

        const ranked = rankRelatedNaats({
          currentId: propNaatId,
          currentTitle: title ?? "",
          candidates: [...searchResults.flat(), ...popular],
          profile,
          watchTimestamps,
          limit: 12,
        });
        setRelated(ranked);
        setRelatedHasMore(popular.length > 0);
      } catch (error) {
        console.warn("[VideoScreen] Failed to load related naats:", error);
        if (!cancelled) {
          setRelated([]);
          setRelatedError("Unable to load related naats.");
          setRelatedHasMore(false);
        }
      } finally {
        if (!cancelled) setRelatedLoading(false);
      }
    };

    void loadRelated();

    return () => {
      cancelled = true;
    };
  }, [propNaatId, relatedRequestKey, title]);

  const loadMoreRelated = React.useCallback(async () => {
    if (
      !features.showRelatedVideos ||
      relatedLoading ||
      relatedLoadingMore ||
      !relatedHasMore ||
      relatedLoadingRef.current
    ) {
      return;
    }

    relatedLoadingRef.current = true;
    setRelatedLoadingMore(true);
    setRelatedError(null);
    try {
      const { popular: popularOffset, latest: latestOffset } =
        relatedOffsets.current;
      const [popular, latest] = await Promise.all([
        appwriteService.getNaats(12, popularOffset, "popular"),
        appwriteService.getNaats(12, latestOffset, "latest"),
      ]);
      relatedOffsets.current.popular += popular.length;
      relatedOffsets.current.latest += latest.length;

      const [profile, watchTimestamps] = await Promise.all([
        userProfileService.getProfile(),
        storageService.getWatchHistoryTimestamps(),
      ]);
      const next = rankRelatedNaats({
        currentId: propNaatId,
        currentTitle: title ?? "",
        candidates: [...popular, ...latest],
        profile,
        watchTimestamps,
        limit: 12,
      });
      setRelated((current) => dedupeRelatedNaats([...current, ...next]));
      setRelatedHasMore(popular.length > 0 || latest.length > 0);
    } catch (error) {
      console.warn("[VideoScreen] Failed to load more related naats:", error);
      setRelatedError("Unable to load more naats. Tap retry to try again.");
    } finally {
      relatedLoadingRef.current = false;
      setRelatedLoadingMore(false);
    }
  }, [propNaatId, relatedHasMore, relatedLoading, relatedLoadingMore, title]);

  const openRelated = React.useCallback(
    (naat: Naat) => {
      void appwriteService.incrementAppView(naat.$id).catch(() => {});
      void storageService.addToWatchHistory(naat.$id).catch(() => {});
      void userProfileService.recordPlay(naat).catch(() => {});

      router.replace({
        pathname: "/video",
        params: {
          naatId: naat.$id,
          videoUrl:
            naat.videoUrl ||
            (naat.youtubeId
              ? `https://www.youtube.com/watch?v=${naat.youtubeId}`
              : ""),
          title: naat.title,
          channelName: naat.channelName,
          thumbnailUrl: naat.thumbnailUrl,
          duration: String(naat.duration),
          youtubeId: naat.youtubeId,
          audioId: naat.cutAudio || naat.audioId,
          isFallback: "false",
        },
      });
    },
    [router],
  );

  // Autoplay continues with the top related naat when the video ends.
  React.useEffect(() => {
    const handleAutoplay = async () => {
      const next = related[0];
      if (!next) return;
      openRelated(next);
    };

    setAutoplayCallback(handleAutoplay);
    return () => setAutoplayCallback(null);
  }, [openRelated, related, setAutoplayCallback]);

  // Player chrome (seek slider + audio switch). Pinned under the iframe on
  // desktop; on mobile it lives inside the scroll area so only the video stays.
  const videoControls = (
    <View
      className={isDesktopWeb ? "px-6 pb-8" : "pt-3 pb-4"}
      style={{ backgroundColor: colors.background.primary }}
    >
      {/* Progress Bar (hidden on web: YouTube iframe provides its own controls) */}
      {!isWeb && (
        <View className="mb-4">
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={0}
            maximumValue={videoDuration}
            value={videoPosition}
            onSlidingComplete={seekToPosition}
            minimumTrackTintColor={colors.accent.primary}
            maximumTrackTintColor={colors.border.primary}
            thumbTintColor={colors.accent.primary}
          />

          {/* Time Labels */}
          <View className="flex-row justify-between">
            <Text className="text-sm" style={{ color: colors.text.secondary }}>
              {formatTime(videoPosition)}
            </Text>
            <Text className="text-sm" style={{ color: colors.text.secondary }}>
              {videoDuration > 0 ? formatTime(videoDuration) : "--:--"}
            </Text>
          </View>
        </View>
      )}

      {/* Switch to audio mode button */}
      <Pressable
        onPress={switchToAudio}
        disabled={audioLoading}
        className="flex-row items-center justify-center self-center rounded-full px-5 py-2.5 active:opacity-80"
        style={[
          {
            backgroundColor: colors.accent.tabActive,
            ...shadows.accent,
          },
        ]}
        accessibilityLabel="Switch to audio mode"
        accessibilityRole="button"
      >
        {audioLoading ? (
          <>
            <ActivityIndicator size="small" color={colors.text.primary} />
            <Text
              className="ml-2 text-sm font-bold"
              style={{ color: colors.text.primary }}
            >
              Loading Audio...
            </Text>
          </>
        ) : (
          <>
            <Ionicons
              name="musical-notes"
              size={18}
              color={colors.text.primary}
            />
            <Text
              className="ml-2 text-sm font-bold"
              style={{ color: colors.text.primary }}
            >
              Switch to Audio Mode
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );

  return (
    <>
      <StatusBar
        hidden={isFullscreen}
        barStyle={resolvedTheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background.primary}
      />

      <SafeAreaView
        edges={["bottom", "top"]}
        className="flex-1"
        style={{ backgroundColor: colors.background.primary }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={colors.overlay.screenGradient}
          locations={[0, 0.18, 0.58, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* The player itself never scrolls; only the content below/beside it. */}
        <View style={isDesktopWeb ? styles.desktopLayout : styles.mobileLayout}>
          <View
            className="overflow-hidden"
            style={[
              shadows.lg,
              { backgroundColor: colors.background.secondary },
              isDesktopWeb
                ? styles.desktopPlayerColumn
                : styles.mobilePlayerColumn,
            ]}
            onLayout={(e) => {
              setPlayerWidth(e.nativeEvent.layout.width);
            }}
          >
            {/* Video Player */}
            <View className="bg-black">
              <View className="relative" style={{ height: playerHeight }}>
                <YoutubePlayer
                  ref={playerRef}
                  height={playerHeight}
                  videoId={videoId}
                  play={videoPlaying && !isFullscreen}
                  onReady={() => {
                    console.log("[VideoScreen] Video ready");
                    setIsLoading(false);
                    if (dbDuration === 0 && playerRef.current) {
                      // Add a small delay to ensure video is fully loaded
                      setTimeout(async () => {
                        try {
                          const duration =
                            await playerRef.current.getDuration();
                          console.log(
                            "[VideoScreen] Video duration:",
                            duration,
                          );
                          setVideoDuration(duration);
                          // Update context duration
                          setContextDuration(duration);
                        } catch (error) {
                          console.error(
                            "[VideoScreen] Error getting duration:",
                            error,
                          );
                          // Fallback: try again after another delay
                          setTimeout(async () => {
                            try {
                              const duration =
                                await playerRef.current.getDuration();
                              console.log(
                                "[VideoScreen] Video duration (retry):",
                                duration,
                              );
                              setVideoDuration(duration);
                              setContextDuration(duration);
                            } catch (retryError) {
                              console.error(
                                "[VideoScreen] Error getting duration (retry):",
                                retryError,
                              );
                            }
                          }, 1000);
                        }
                      }, 500);
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
                    preventFullScreen: true,
                  }}
                />

                {!isLoading && (
                  <Pressable
                    onPress={() => void openFullscreen()}
                    style={styles.inlineFullscreenButton}
                    accessibilityRole="button"
                    accessibilityLabel="Open fullscreen video"
                  >
                    <MaterialCommunityIcons
                      name="fullscreen"
                      size={18}
                      color="#fff"
                    />
                  </Pressable>
                )}

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

              {isDesktopWeb && videoControls}
            </View>
          </View>

          {/* Related content scrolls independently of the player. */}
          <FlatList
            ref={relatedScrollRef}
            data={features.showRelatedVideos ? related : []}
            keyExtractor={(naat) => naat.$id}
            renderItem={({ item }) => (
              <RelatedVideoRow naat={item} onPress={() => openRelated(item)} />
            )}
            style={
              isDesktopWeb
                ? styles.desktopRelatedScroll
                : styles.mobileRelatedScroll
            }
            contentContainerStyle={
              isDesktopWeb ? styles.desktopRelated : styles.mobileRelated
            }
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreRelated}
            onEndReachedThreshold={0.7}
            ListHeaderComponent={
              <>
                {/* Mobile: player chrome scrolls with the list; only the video is fixed. */}
                {!isDesktopWeb && videoControls}
                {features.showRelatedVideos && (
                  <View style={styles.relatedHeader}>
                    <Text
                      style={[
                        styles.relatedTitle,
                        { color: colors.text.primary },
                      ]}
                    >
                      Related
                    </Text>
                    <Pressable
                      onPress={() => void toggleAutoplay()}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: isAutoplayEnabled }}
                      accessibilityLabel={
                        isAutoplayEnabled
                          ? "Disable autoplay"
                          : "Enable autoplay"
                      }
                      style={[
                        styles.autoplayToggle,
                        {
                          backgroundColor: isAutoplayEnabled
                            ? colors.accent.primary + "22"
                            : colors.background.tertiary,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          isAutoplayEnabled
                            ? "play-circle"
                            : "play-circle-outline"
                        }
                        size={16}
                        color={
                          isAutoplayEnabled
                            ? colors.accent.primary
                            : colors.text.secondary
                        }
                      />
                      <Text
                        style={[
                          styles.autoplayText,
                          {
                            color: isAutoplayEnabled
                              ? colors.accent.primary
                              : colors.text.secondary,
                          },
                        ]}
                      >
                        Autoplay
                      </Text>
                    </Pressable>
                  </View>
                )}
                {relatedLoading && (
                  <ActivityIndicator
                    style={{ marginTop: 16 }}
                    color={colors.accent.primary}
                  />
                )}
                {!relatedLoading && related.length === 0 && (
                  <>
                    <Text
                      style={[
                        styles.relatedEmpty,
                        { color: colors.text.tertiary },
                      ]}
                    >
                      {relatedError || "No related naats found."}
                    </Text>
                    {relatedError && (
                      <Pressable
                        onPress={() => setRelatedRequestKey((key) => key + 1)}
                        style={styles.relatedRetry}
                      >
                        <Text style={{ color: colors.accent.primary }}>
                          Retry loading
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}
              </>
            }
            ListFooterComponent={
              relatedLoadingMore ? (
                <ActivityIndicator
                  style={{ marginVertical: 16 }}
                  color={colors.accent.primary}
                />
              ) : relatedError && related.length > 0 ? (
                <Pressable
                  onPress={loadMoreRelated}
                  style={styles.relatedRetry}
                >
                  <Text style={{ color: colors.accent.primary }}>
                    Retry loading
                  </Text>
                </Pressable>
              ) : !relatedLoading && !relatedHasMore && related.length > 0 ? (
                <Text
                  style={[styles.relatedEnd, { color: colors.text.tertiary }]}
                >
                  You&apos;ve reached the end of related naats.
                </Text>
              ) : null
            }
          />
        </View>
      </SafeAreaView>

      <Modal
        visible={isFullscreen}
        animationType="fade"
        supportedOrientations={["landscape", "portrait"]}
        onShow={() => {
          // Android can restore the navigation bar when the Modal window is
          // attached, so apply immersive mode after the fullscreen window exists.
          void setSystemBarsVisible(false);
        }}
        onDismiss={() => {
          void setSystemBarsVisible(true);
        }}
        onRequestClose={() => void closeFullscreen()}
      >
        <View style={styles.fullscreenOverlay}>
          <View
            style={[
              styles.fullscreenVideoViewport,
              { height: windowHeight, width: windowWidth },
            ]}
          >
            <YoutubePlayer
              ref={fullscreenPlayerRef}
              width={fullscreenPlayerWidth}
              height={fullscreenPlayerHeight}
              videoId={videoId}
              play={videoPlaying && isFullscreen}
              onChangeState={onStateChange}
              onError={() => {
                Alert.alert(
                  "Video Error",
                  "Unable to load video in fullscreen.",
                  [{ text: "OK" }],
                );
              }}
              initialPlayerParams={{
                controls: true,
                modestbranding: true,
                rel: false,
                preventFullScreen: true,
                ...(fullscreenStartTime > 0
                  ? { start: fullscreenStartTime }
                  : {}),
              }}
              viewContainerStyle={{
                transform: [{ scale: isZoomed ? 1.35 : 1 }],
              }}
            />
          </View>

          <View style={styles.fullscreenActions}>
            <Pressable
              onPress={() => setIsZoomed((zoomed) => !zoomed)}
              style={styles.fullscreenAction}
              accessibilityRole="button"
              accessibilityLabel={
                isZoomed ? "Show original size" : "Fill screen"
              }
            >
              <Ionicons
                name={isZoomed ? "contract-outline" : "expand-outline"}
                size={20}
                color="#fff"
              />
              <Text style={styles.fullscreenActionText}>
                {isZoomed ? "Original" : "Fill"}
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => void closeFullscreen()}
            style={styles.fullscreenCloseButton}
            accessibilityRole="button"
            accessibilityLabel="Close fullscreen"
          >
            <MaterialCommunityIcons
              name="fullscreen-exit"
              size={18}
              color="#fff"
            />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Desktop web: fixed player column + independently scrolling related rail.
  desktopLayout: {
    flex: 1,
    flexDirection: "row",
    width: "100%",
    maxWidth: WEB_MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 24,
  },
  desktopPlayerColumn: {
    flex: 1,
    minWidth: 0,
    alignSelf: "flex-start",
  },
  desktopRelatedScroll: {
    // FlatList's base style sets flexGrow: 1, so pin the width explicitly.
    flexGrow: 0,
    flexShrink: 0,
    width: 380,
  },
  desktopRelated: {
    paddingTop: 4,
    paddingBottom: 24,
  },
  // Mobile: fixed player at the top, related list scrolls underneath it.
  mobileLayout: {
    flex: 1,
  },
  mobilePlayerColumn: {
    flexShrink: 0,
  },
  mobileRelatedScroll: {
    flex: 1,
  },
  mobileRelated: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  relatedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  autoplayToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  autoplayText: {
    fontSize: 12,
    fontWeight: "600",
  },
  relatedEmpty: {
    fontSize: 13,
    paddingVertical: 8,
  },
  relatedRetry: {
    alignItems: "center",
    paddingVertical: 14,
  },
  relatedEnd: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 16,
  },
  inlineFullscreenButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenVideoViewport: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenActions: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  fullscreenAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  fullscreenActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  fullscreenCloseButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
});
