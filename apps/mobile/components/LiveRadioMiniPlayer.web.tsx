import { useLiveRadioPlayer } from "@/contexts/LiveRadioContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface LiveRadioMiniPlayerProps {
  onExpand: () => void;
  networkIndicatorOffset: { value: number };
}

const LiveRadioMiniPlayer: React.FC<LiveRadioMiniPlayerProps> = () => {
  const { currentNaat, isPlaying, play, pauseFromMiniPlayer, stop } = useLiveRadioPlayer();

  return (
    <View
      style={{
        position: "fixed" as any,
        left: 292,
        right: 28,
        bottom: 24,
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: "rgba(11, 24, 20, 0.95)",
        borderWidth: 1,
        borderColor: "rgba(52,211,153,0.22)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <Link href="/live" asChild>
          <Pressable style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View style={{ width: 92, aspectRatio: 16 / 9, borderRadius: 14, overflow: "hidden", marginRight: 14 }}>
              <Image
                source={require("@/assets/images/gumbad.png")}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            </View>
            <View>
              <Text style={{ color: "#f4fffb", fontSize: 16, fontWeight: "700" }}>{currentNaat.title}</Text>
              <Text style={{ color: "rgba(255,255,255,0.58)", marginTop: 4 }}>Live stream</Text>
            </View>
          </Pressable>
        </Link>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => {
              void (isPlaying ? pauseFromMiniPlayer() : play());
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
            style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default LiveRadioMiniPlayer;
