import { colors } from "@/constants/theme";
import { useLiveRadioPlayer } from "@/contexts/LiveRadioContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export default function LiveWebScreen() {
  const { isLoading, isPlaying, play, pause, error } = useLiveRadioPlayer();

  return (
    <View style={{ minHeight: 680, justifyContent: "center" }}>
      <View
        style={{
          borderRadius: 30,
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.04)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
          padding: 28,
          flexDirection: "row",
          alignItems: "center",
          gap: 28,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#f9fbff", fontSize: 34, fontWeight: "800" }}>
            Live radio
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.56)",
              marginTop: 8,
              fontSize: 15,
              lineHeight: 24,
            }}
          >
            Start the stream and keep listening while browsing the rest of the site.
          </Text>
          {error ? <Text style={{ color: "#f87171", marginTop: 16 }}>{error}</Text> : null}
          <Pressable
            onPress={() => {
              void (isPlaying ? pause() : play());
            }}
            style={{
              marginTop: 24,
              alignSelf: "flex-start",
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderRadius: 999,
              backgroundColor: "rgba(29,185,84,0.18)",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#fff" />
            )}
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {isPlaying ? "Pause stream" : "Play stream"}
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            width: 360,
            aspectRatio: 1,
            borderRadius: 28,
            overflow: "hidden",
            backgroundColor: colors.background.tertiary,
          }}
        >
          <Image
            source={require("@/assets/images/gumbad.png")}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>
      </View>
    </View>
  );
}
