import { colors } from "@/constants/theme";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface MiniPlayerProps {
  onExpand: () => void;
  networkIndicatorOffset: { value: number };
}

const MiniPlayer: React.FC<MiniPlayerProps> = () => {
  const { currentAudio, isPlaying, togglePlayPause, stop, position, duration } =
    useAudioPlayer();

  if (!currentAudio) return null;

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View
      style={{
        position: "fixed" as any,
        left: 292,
        right: 28,
        bottom: 24,
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: "rgba(9, 14, 22, 0.92)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.35)" as any,
      }}
    >
      <View style={{ height: 3, backgroundColor: "rgba(255,255,255,0.08)" }}>
        <View
          style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor: colors.accent.primary,
          }}
        />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <Link href="/player" asChild>
          <Pressable style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 92,
                aspectRatio: 16 / 9,
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: colors.background.tertiary,
                marginRight: 14,
              }}
            >
              <Image
                source={{ uri: currentAudio.thumbnailUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: "#f7f9fc", fontSize: 16, fontWeight: "700" }}>
                {currentAudio.title}
              </Text>
              <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.58)", marginTop: 4 }}>
                {currentAudio.channelName}
              </Text>
            </View>
          </Pressable>
        </Link>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => {
              void togglePlayPause();
            }}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => {
              void stop();
            }}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default MiniPlayer;
