import Pressable from "@/components/ResponsivePressable";
import { colors, shadows } from "@/constants/theme";
import { AudioMetadata, useAudioPlayer } from "@/contexts/AudioContext.web";
import { useVideoPlayer } from "@/contexts/VideoContext";
import { appwriteService } from "@/services/appwrite";
import { storageService } from "@/services/storage";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const loadYouTubeApi = (() => {
  let promise: Promise<any> | null = null;

  return () => {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("YouTube API is only available on web"));
    }

    if (window.YT?.Player) {
      return Promise.resolve(window.YT);
    }

    if (promise) {
      return promise;
    }

    promise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      );

      const finish = () => {
        if (window.YT?.Player) {
          resolve(window.YT);
        }
      };

      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        finish();
      };

      if (existingScript) {
        finish();
        setTimeout(() => {
          if (!window.YT?.Player) {
            reject(new Error("Timed out waiting for YouTube API"));
          }
        }, 8000);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load YouTube API"));
      document.head.appendChild(script);
    });

    return promise;
  };
})();

const formatTime = (seconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const getYouTubeId = (url: string, explicitId?: string) => {
  if (explicitId) {
    return explicitId;
  }

  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7]?.length === 11 ? match[7] : "";
};

export default function VideoWebScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    naatId?: string;
    videoUrl?: string;
    title?: string;
    channelName?: string;
    thumbnailUrl?: string;
    duration?: string;
    youtubeId?: string;
    audioId?: string;
    isFallback?: string;
  }>();

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
  } = useVideoPlayer();

  const [isLoading, setIsLoading] = React.useState(true);
  const [audioLoading, setAudioLoading] = React.useState(false);
  const [videoPlaying, setVideoPlaying] = React.useState(false);
  const [videoDuration, setVideoDuration] = React.useState(
    Number(params.duration || 0),
  );
  const [videoPosition, setVideoPosition] = React.useState(0);
  const [videoError, setVideoError] = React.useState<string | null>(null);
  const [restoredStartSeconds, setRestoredStartSeconds] = React.useState(0);

  const playerHostRef = React.useRef<HTMLDivElement | null>(null);
  const playerRef = React.useRef<any>(null);
  const savePositionTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const title = params.title || "Unknown Title";
  const channelName = params.channelName || "Unknown Channel";
  const thumbnailUrl = params.thumbnailUrl || "";
  const videoUrl = params.videoUrl || "";
  const audioId = params.audioId;
  const naatId = params.naatId;
  const isFallback = params.isFallback === "true";
  const videoId = getYouTubeId(videoUrl, params.youtubeId);

  React.useEffect(() => {
    let cancelled = false;

    const restorePosition = async () => {
      if (!naatId) {
        return;
      }

      try {
        const saved = await storageService.getPlaybackPosition(naatId);
        if (!cancelled && typeof saved === "number" && saved > 0) {
          setRestoredStartSeconds(saved);
          setVideoPosition(saved);
          setContextPosition(saved);
        }
      } catch (error) {
        console.error("[VideoWeb] Failed to restore playback position:", error);
      }
    };

    void restorePosition();

    return () => {
      cancelled = true;
    };
  }, [naatId, setContextPosition]);

  React.useEffect(() => {
    if (!videoId) {
      setIsLoading(false);
      setVideoError("This naat does not have a valid YouTube video.");
      return;
    }

    setIsLoading(true);
    setVideoError(null);
    setVideoPosition(restoredStartSeconds);
    setContextPosition(restoredStartSeconds);
    setContextDuration(videoDuration);

    loadVideo({
      videoUrl,
      videoId,
      title,
      channelName,
      thumbnailUrl,
      youtubeId: params.youtubeId,
      audioId,
    });

    if (!isFallback) {
      storageService.savePlaybackMode("video").catch((error) => {
        console.error("[VideoWeb] Failed to save playback mode:", error);
      });
    }

    return () => {
      clearVideo();
    };
  }, [
    audioId,
    channelName,
    clearVideo,
    isFallback,
    loadVideo,
    params.youtubeId,
    restoredStartSeconds,
    setContextDuration,
    setContextPosition,
    thumbnailUrl,
    title,
    videoDuration,
    videoId,
    videoUrl,
  ]);

  React.useEffect(() => {
    if (!videoId || !playerHostRef.current) {
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const syncPosition = async () => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) {
        return;
      }

      try {
        const [currentTime, duration] = await Promise.all([
          Promise.resolve(player.getCurrentTime()),
          Promise.resolve(player.getDuration?.() ?? 0),
        ]);

        if (cancelled) {
          return;
        }

        if (typeof currentTime === "number" && Number.isFinite(currentTime)) {
          setVideoPosition(currentTime);
          setContextPosition(currentTime);
        }

        if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
          setVideoDuration(duration);
          setContextDuration(duration);
        }
      } catch (error) {
        console.error("[VideoWeb] Failed to sync player state:", error);
      }
    };

    const createPlayer = async () => {
      try {
        const YT = await loadYouTubeApi();
        if (cancelled || !playerHostRef.current) {
          return;
        }

        playerRef.current?.destroy?.();
        playerHostRef.current.innerHTML = "";

        playerRef.current = new YT.Player(playerHostRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            start: Math.floor(restoredStartSeconds),
          },
          events: {
            onReady: (event: any) => {
              setIsLoading(false);
              setVideoError(null);
              setVideoPlaying(true);
              setPlaying(true);

              try {
                event.target.playVideo();
              } catch {}

              void syncPosition();
            },
            onStateChange: (event: any) => {
              const state = event.data;

              if (state === YT.PlayerState.PLAYING) {
                setIsLoading(false);
                setVideoPlaying(true);
                setPlaying(true);
              } else if (state === YT.PlayerState.PAUSED) {
                setVideoPlaying(false);
                setPlaying(false);
              } else if (state === YT.PlayerState.BUFFERING) {
                setIsLoading(true);
              } else if (state === YT.PlayerState.ENDED) {
                setVideoPlaying(false);
                setPlaying(false);

                if (isRepeatEnabled) {
                  event.target.seekTo(0, true);
                  event.target.playVideo();
                } else {
                  handleVideoEnd();
                }
              }
            },
            onError: () => {
              setIsLoading(false);
              setVideoPlaying(false);
              setPlaying(false);
              setVideoError(
                "Unable to load video. Please check your connection and try again.",
              );
            },
          },
        });

        intervalId = setInterval(() => {
          void syncPosition();
        }, 1000);
      } catch (error) {
        console.error("[VideoWeb] Failed to create player:", error);
        setIsLoading(false);
        setVideoError("Unable to initialize video playback.");
      }
    };

    void createPlayer();

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [
    handleVideoEnd,
    isRepeatEnabled,
    restoredStartSeconds,
    setContextDuration,
    setContextPosition,
    setPlaying,
    videoId,
  ]);

  React.useEffect(() => {
    if (!naatId) {
      return;
    }

    if (savePositionTimeoutRef.current) {
      clearTimeout(savePositionTimeoutRef.current);
    }

    savePositionTimeoutRef.current = setTimeout(() => {
      storageService.savePlaybackPosition(naatId, videoPosition).catch((error) => {
        console.error("[VideoWeb] Failed to save playback position:", error);
      });
    }, 500);

    return () => {
      if (savePositionTimeoutRef.current) {
        clearTimeout(savePositionTimeoutRef.current);
      }
    };
  }, [naatId, videoPosition]);

  const togglePlayPause = React.useCallback(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    try {
      if (videoPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } catch (error) {
      console.error("[VideoWeb] Failed to toggle playback:", error);
    }
  }, [videoPlaying]);

  const seekToPosition = React.useCallback(
    (seconds: number) => {
      const player = playerRef.current;
      if (!player) {
        return;
      }

      try {
        player.seekTo(seconds, true);
        setVideoPosition(seconds);
        setContextPosition(seconds);
      } catch (error) {
        console.error("[VideoWeb] Failed to seek:", error);
      }
    },
    [setContextPosition],
  );

  const switchToAudio = React.useCallback(async () => {
    if (!audioId) {
      Alert.alert("Audio Not Available", "No audio is linked to this naat.");
      return;
    }

    try {
      setAudioLoading(true);

      const response = await appwriteService.getAudioUrl(audioId);
      if (!response.success || !response.audioUrl) {
        Alert.alert(
          "Audio Not Available",
          response.error || "Audio is not available for this naat.",
        );
        setAudioLoading(false);
        return;
      }

      const audioMetadata: AudioMetadata = {
        audioUrl: response.audioUrl,
        title,
        channelName,
        thumbnailUrl,
        isLocalFile: false,
        audioId,
        youtubeId: params.youtubeId,
        naatId,
      };

      await loadAndPlay(audioMetadata);
      await storageService.savePlaybackMode("audio");

      setAudioLoading(false);
      router.replace("/player");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to switch to audio";
      Alert.alert("Audio Error", message);
      setAudioLoading(false);
    }
  }, [
    audioId,
    channelName,
    loadAndPlay,
    naatId,
    params.youtubeId,
    router,
    thumbnailUrl,
    title,
  ]);

  if (!videoId) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.stateTitle}>Video unavailable</Text>
        <Text style={styles.stateBody}>
          This naat is missing a valid video link.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.videoCard}>
        <View style={styles.videoStage}>
          <View style={styles.playerSurface}>
            {React.createElement("div", {
              ref: playerHostRef,
              style: { width: "100%", height: "100%" },
            })}
          </View>

          {(isLoading || videoError) && (
            <View style={styles.videoOverlay}>
              {videoError ? (
                <>
                  <Text style={styles.stateTitle}>Video error</Text>
                  <Text style={styles.stateBody}>{videoError}</Text>
                </>
              ) : (
                <>
                  <ActivityIndicator size="large" color={colors.text.primary} />
                  <Text style={styles.loadingText}>Loading video...</Text>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.contentColumn}>
          <View style={styles.metaHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.channel}>{channelName}</Text>
            </View>
            <Pressable
              onPress={() => router.replace("/home")}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close video player"
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.contentGrid}>
            <View style={styles.posterCard}>
              {thumbnailUrl ? (
                <Image
                  source={{ uri: thumbnailUrl }}
                  style={styles.posterImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.posterImage, styles.posterFallback]} />
              )}
            </View>

            <View style={styles.controlsColumn}>
              <View>
                <Slider
                  style={{ width: "100%", height: 40 }}
                  minimumValue={0}
                  maximumValue={Math.max(videoDuration, 1)}
                  value={Math.min(videoPosition, Math.max(videoDuration, 1))}
                  onSlidingComplete={seekToPosition}
                  minimumTrackTintColor={colors.accent.primary}
                  maximumTrackTintColor="rgba(255,255,255,0.12)"
                  thumbTintColor={colors.accent.primary}
                />
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime(videoPosition)}</Text>
                  <Text style={styles.timeText}>
                    {videoDuration > 0 ? formatTime(videoDuration) : "--:--"}
                  </Text>
                </View>
              </View>

              <View style={styles.transportRow}>
                <Pressable onPress={() => seekToPosition(Math.max(0, videoPosition - 10))}>
                  <MaterialIcons name="replay-10" size={34} color="#fff" />
                </Pressable>
                <Pressable onPress={togglePlayPause} style={styles.playButton}>
                  <Ionicons
                    name={videoPlaying ? "pause" : "play"}
                    size={30}
                    color="#fff"
                  />
                </Pressable>
                <Pressable
                  onPress={() =>
                    seekToPosition(
                      Math.min(videoDuration || videoPosition + 10, videoPosition + 10),
                    )
                  }
                >
                  <MaterialIcons name="forward-10" size={34} color="#fff" />
                </Pressable>
              </View>

              <View style={styles.pillRow}>
                <Pressable
                  onPress={() => {
                    void toggleRepeat();
                  }}
                  style={[
                    styles.pillButton,
                    isRepeatEnabled && styles.pillButtonActive,
                  ]}
                >
                  <Text style={styles.pillText}>Repeat</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void toggleAutoplay();
                  }}
                  style={[
                    styles.pillButton,
                    isAutoplayEnabled && styles.autoplayButtonActive,
                  ]}
                >
                  <Text style={styles.pillText}>Autoplay</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={switchToAudio}
                disabled={audioLoading}
                style={styles.audioButton}
                accessibilityRole="button"
                accessibilityLabel="Play as audio only"
              >
                {audioLoading ? (
                  <>
                    <ActivityIndicator size="small" color={colors.text.primary} />
                    <Text style={styles.audioButtonText}>Loading audio...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="musical-notes"
                      size={22}
                      color={colors.text.primary}
                    />
                    <Text style={styles.audioButtonText}>Play as Audio Only</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  videoCard: {
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(8, 12, 18, 0.95)",
    ...shadows.lg,
  },
  videoStage: {
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    position: "relative",
  },
  playerSurface: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.78)",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "rgba(255,255,255,0.68)",
  },
  contentColumn: {
    padding: 28,
    gap: 24,
  },
  metaHeader: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    color: "#f8fbff",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
  },
  channel: {
    color: "rgba(255,255,255,0.6)",
    marginTop: 10,
    fontSize: 15,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  contentGrid: {
    flexDirection: "row",
    gap: 24,
    alignItems: "stretch",
  },
  posterCard: {
    width: 260,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.background.tertiary,
  },
  posterImage: {
    width: "100%",
    aspectRatio: 1,
  },
  posterFallback: {
    backgroundColor: colors.background.tertiary,
  },
  controlsColumn: {
    flex: 1,
    justifyContent: "space-between",
    minHeight: 260,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeText: {
    color: "rgba(255,255,255,0.54)",
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    marginTop: 30,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  pillRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  pillButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pillButtonActive: {
    backgroundColor: "rgba(29,185,84,0.2)",
  },
  autoplayButtonActive: {
    backgroundColor: "rgba(37,99,235,0.22)",
  },
  pillText: {
    color: "#fff",
  },
  audioButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.accent.primary,
    ...shadows.accent,
  },
  audioButtonText: {
    marginLeft: 10,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  centeredState: {
    flex: 1,
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: "#f8fbff",
    fontSize: 22,
    fontWeight: "800",
  },
  stateBody: {
    marginTop: 10,
    color: "rgba(255,255,255,0.62)",
    textAlign: "center",
    maxWidth: 420,
    lineHeight: 22,
  },
});
