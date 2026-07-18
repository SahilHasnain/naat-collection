import { colors } from "@/constants/theme";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface FullPlayerModalProps {
  onSwitchToVideo?: () => void;
  topInset?: number;
  bottomInset?: number;
}

const formatTime = (millis: number) => {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const FullPlayerModal: React.FC<FullPlayerModalProps> = ({ onSwitchToVideo }) => {
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
    togglePlayPause,
    seek,
    toggleRepeat,
    toggleAutoplay,
    setABRepeatPointA,
    setABRepeatPointB,
    clearABRepeat,
    stop,
  } = useAudioPlayer();
  const router = useRouter();

  if (!currentAudio) return null;

  return (
    <View
      style={{
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        backgroundColor: "rgba(15, 15, 15, 0.98)",
      }}
    >
      <View style={{ flexDirection: "row", minHeight: 600 }}>
        <View
          style={{
            flex: 1,
            padding: 32,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              borderRadius: 20,
              overflow: "hidden",
              aspectRatio: 16 / 9,
              width: "85%",
              maxWidth: 400,
              backgroundColor: colors.background.tertiary,
            }}
          >
            <Image
              source={{ uri: currentAudio.thumbnailUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>
        </View>

        <View
          style={{
            flex: 1,
            padding: 36,
            justifyContent: "space-between",
          }}
        >
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={{
                    color: colors.text.primary,
                    fontSize: 26,
                    fontWeight: "700",
                    lineHeight: 34,
                    letterSpacing: -0.3,
                  }}
                >
                  {currentAudio.title}
                </Text>
  
              </View>
              <Pressable
                onPress={() => {
                  void stop();
                  router.replace("/home");
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.background.tertiary,
                }}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={colors.text.secondary}
                />
              </Pressable>
            </View>
          </View>

          <View>
            <Slider
              style={{ width: "100%", height: 36 }}
              minimumValue={0}
              maximumValue={duration || 1}
              value={position}
              onSlidingComplete={(value) => {
                void seek(value);
              }}
              minimumTrackTintColor={colors.accent.primary}
              maximumTrackTintColor={colors.background.elevated}
              thumbTintColor={colors.accent.primary}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 6,
              }}
            >
              <Text
                style={{
                  color: colors.text.tertiary,
                  fontSize: 12,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatTime(position)}
              </Text>
              <Text
                style={{
                  color: colors.text.tertiary,
                  fontSize: 12,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatTime(duration)}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
                marginTop: 28,
              }}
            >
              <Pressable onPress={() => void seek(Math.max(0, position - 10000))}>
                <MaterialIcons
                  name="replay-10"
                  size={32}
                  color={colors.text.primary}
                />
              </Pressable>
              <Pressable
                onPress={() => void togglePlayPause()}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.accent.primary,
                }}
              >
                {isLoading ? (
                  <Ionicons name="hourglass" size={28} color={colors.background.primary} />
                ) : (
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={30}
                    color={colors.background.primary}
                  />
                )}
              </Pressable>
              <Pressable onPress={() => void seek(Math.min(duration, position + 10000))}>
                <MaterialIcons
                  name="forward-10"
                  size={32}
                  color={colors.text.primary}
                />
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Pressable
                onPress={() => void toggleRepeat()}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: isRepeatEnabled
                    ? "rgba(29,185,84,0.2)"
                    : colors.background.tertiary,
                }}
              >
                <Text
                  style={{
                    color: isRepeatEnabled
                      ? colors.accent.primary
                      : colors.text.secondary,
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  Repeat
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void toggleAutoplay()}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: isAutoplayEnabled
                    ? "rgba(37,99,235,0.2)"
                    : colors.background.tertiary,
                }}
              >
                <Text
                  style={{
                    color: isAutoplayEnabled
                      ? colors.accent.secondary
                      : colors.text.secondary,
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  Autoplay
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setABRepeatPointA(position)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: colors.background.tertiary,
                }}
              >
                <Text style={{ color: colors.text.secondary, fontSize: 13, fontWeight: "500" }}>
                  Set A
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setABRepeatPointB(position)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: colors.background.tertiary,
                }}
              >
                <Text style={{ color: colors.text.secondary, fontSize: 13, fontWeight: "500" }}>
                  Set B
                </Text>
              </Pressable>
              {abRepeatPointA !== null || abRepeatPointB !== null ? (
                <Pressable
                  onPress={clearABRepeat}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: "rgba(239,68,68,0.15)",
                  }}
                >
                  <Text style={{ color: colors.accent.error, fontSize: 13, fontWeight: "500" }}>
                    Clear loop
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {currentAudio.youtubeId && onSwitchToVideo ? (
              <Pressable
                onPress={onSwitchToVideo}
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: colors.background.tertiary,
                }}
              >
                <Text style={{ color: colors.text.secondary, fontSize: 13, fontWeight: "500" }}>
                  Open video
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
};

export default FullPlayerModal;
