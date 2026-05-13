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
        borderRadius: 28,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(8, 12, 18, 0.94)",
      }}
    >
      <View style={{ flexDirection: "row", minHeight: 620 }}>
        <View style={{ flex: 1.1, padding: 28, justifyContent: "center" }}>
          <View
            style={{
              borderRadius: 28,
              overflow: "hidden",
              aspectRatio: 1,
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

        <View style={{ flex: 1, padding: 36, justifyContent: "space-between" }}>
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                style={{ color: "#f8fbff", fontSize: 30, fontWeight: "800", lineHeight: 38, flex: 1 }}
              >
                {currentAudio.title}
              </Text>
              <Pressable
                onPress={() => {
                  void stop();
                  router.replace("/home");
                }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 15, marginTop: 10 }}>
              {currentAudio.channelName}
            </Text>
          </View>

          <View>
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0}
              maximumValue={duration || 1}
              value={position}
              onSlidingComplete={(value) => {
                void seek(value);
              }}
              minimumTrackTintColor={colors.accent.primary}
              maximumTrackTintColor="rgba(255,255,255,0.12)"
              thumbTintColor={colors.accent.primary}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ color: "rgba(255,255,255,0.54)" }}>{formatTime(position)}</Text>
              <Text style={{ color: "rgba(255,255,255,0.54)" }}>{formatTime(duration)}</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22, marginTop: 30 }}>
              <Pressable onPress={() => void seek(Math.max(0, position - 10000))}>
                <MaterialIcons name="replay-10" size={34} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => {
                  void togglePlayPause();
                }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                }}
              >
                <Ionicons
                  name={isLoading ? "hourglass" : isPlaying ? "pause" : "play"}
                  size={30}
                  color="#fff"
                />
              </Pressable>
              <Pressable onPress={() => void seek(Math.min(duration, position + 10000))}>
                <MaterialIcons name="forward-10" size={34} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
              <Pressable
                onPress={() => {
                  void toggleRepeat();
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: isRepeatEnabled ? "rgba(29,185,84,0.2)" : "rgba(255,255,255,0.06)",
                }}
              >
                <Text style={{ color: "#fff" }}>Repeat</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void toggleAutoplay();
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: isAutoplayEnabled ? "rgba(37,99,235,0.22)" : "rgba(255,255,255,0.06)",
                }}
              >
                <Text style={{ color: "#fff" }}>Autoplay</Text>
              </Pressable>
              <Pressable
                onPress={() => setABRepeatPointA(position)}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)" }}
              >
                <Text style={{ color: "#fff" }}>Set A</Text>
              </Pressable>
              <Pressable
                onPress={() => setABRepeatPointB(position)}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)" }}
              >
                <Text style={{ color: "#fff" }}>Set B</Text>
              </Pressable>
              {abRepeatPointA !== null || abRepeatPointB !== null ? (
                <Pressable
                  onPress={clearABRepeat}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: "rgba(239,68,68,0.18)" }}
                >
                  <Text style={{ color: "#fff" }}>Clear loop</Text>
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
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Text style={{ color: "#fff" }}>Open video</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
};

export default FullPlayerModal;
