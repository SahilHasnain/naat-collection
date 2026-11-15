import Pressable from "@/components/ResponsivePressable";
import { colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import { Modal, Text, View } from "react-native";

/**
 * Global prompt shown when the audio player fails.
 *
 * Track Player errors are asynchronous, so they can happen on any screen while
 * the mini player is running. Instead of leaving the listener with a silent,
 * frozen player, we explain what happened and offer the video as a fallback
 * (the same naat always has a YouTube source in this catalogue).
 */
export default function AudioErrorPrompt() {
  const router = useRouter();
  const segments = useSegments();
  const {
    playbackError,
    currentAudio,
    clearPlaybackError,
    loadAndPlay,
    pause,
  } = useAudioPlayer();

  const isOnVideoScreen = segments[0] === "video";

  // The user already chose the video path (or a video simply started playing):
  // the audio prompt has nothing useful to offer anymore.
  React.useEffect(() => {
    if (playbackError && isOnVideoScreen) {
      clearPlaybackError();
    }
  }, [playbackError, isOnVideoScreen, clearPlaybackError]);

  if (!playbackError || isOnVideoScreen) return null;

  const audio = playbackError.audio ?? currentAudio;
  const title = audio?.title?.trim();
  const youtubeId = audio?.youtubeId;
  const hasVideo = Boolean(youtubeId);

  const handleTryAgain = () => {
    clearPlaybackError();
    if (audio) {
      void loadAndPlay(audio);
    }
  };

  const handleWatchVideo = () => {
    if (!audio || !youtubeId) return;

    clearPlaybackError();
    // The audio is dead, but pause explicitly so a late native frame cannot
    // keep playing underneath the YouTube player.
    void pause().catch(() => {});

    router.push({
      pathname: "/video",
      params: {
        videoUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
        title: audio.title,
        channelName: audio.channelName,
        thumbnailUrl: audio.thumbnailUrl,
        duration: "",
        youtubeId,
        audioId: audio.audioId,
        naatId: audio.naatId,
        // A playback failure must not overwrite the listener's preference.
        isFallback: "true",
      },
    });
  };

  const body = hasVideo
    ? `We couldn't play the audio${
        title ? ` for "${title}"` : ""
      }. ${
        audio?.isLocalFile
          ? "The downloaded file may be incomplete."
          : "This is usually a temporary connection problem."
      } Try again, or watch the video instead.`
    : `We couldn't play the audio${
        title ? ` for "${title}"` : ""
      }. ${
        audio?.isLocalFile
          ? "The downloaded file may be incomplete."
          : "This is usually a temporary connection problem."
      } Please try again in a moment.`;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={clearPlaybackError}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: colors.background.secondary,
            borderWidth: 1,
            borderColor: colors.border.secondary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35,
            shadowRadius: 24,
            elevation: 16,
          }}
        >
          <LinearGradient
            colors={[
              colors.background.tertiary,
              colors.background.secondary,
              colors.background.secondary,
            ]}
            locations={[0, 0.45, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ padding: 24, alignItems: "center" }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.accent.warning + "22",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons
                name="musical-notes-outline"
                size={34}
                color={colors.accent.warning}
              />
            </View>

            <Text
              style={{
                color: colors.text.primary,
                fontSize: 20,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Audio couldn&apos;t play
            </Text>
            <Text
              style={{
                color: colors.text.secondary,
                fontSize: 14,
                lineHeight: 20,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {body}
            </Text>

            {hasVideo && (
              <Pressable
                onPress={handleWatchVideo}
                style={{
                  width: "100%",
                  alignItems: "center",
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: colors.accent.primary,
                }}
                accessibilityRole="button"
                accessibilityLabel="Watch the video version instead"
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="videocam-outline" size={18} color="#ffffff" />
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 15,
                      fontWeight: "700",
                      marginLeft: 8,
                    }}
                  >
                    Watch Video Instead
                  </Text>
                </View>
              </Pressable>
            )}

            <View
              style={{
                flexDirection: "row",
                justifyContent: hasVideo ? "space-between" : "flex-end",
                width: "100%",
                marginTop: 12,
              }}
            >
              <Pressable
                onPress={clearPlaybackError}
                style={{ paddingVertical: 10, paddingHorizontal: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss audio error"
              >
                <Text
                  style={{
                    color: colors.text.tertiary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Dismiss
                </Text>
              </Pressable>
              {audio && (
                <Pressable
                  onPress={handleTryAgain}
                  style={{ paddingVertical: 10, paddingHorizontal: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Try playing the audio again"
                >
                  <Text
                    style={{
                      color: hasVideo
                        ? colors.text.secondary
                        : colors.accent.secondary,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    Try Again
                  </Text>
                </Pressable>
              )}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
