import { colors, shadows } from "@/constants/theme";
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
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: colors.background.secondary,
          borderWidth: 1,
          borderColor: colors.border.secondary,
          padding: 48,
          flexDirection: "row",
          alignItems: "center",
          gap: 48,
        }}
      >
        {/* Left: Content */}
        <View style={{ flex: 1 }}>
          {/* Live badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              backgroundColor: colors.background.tertiary,
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border.secondary,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: isPlaying ? colors.accent.primary : colors.accent.warning,
                marginRight: 8,
              }}
            />
            <Text
              style={{
                color: colors.text.primary,
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 1.2,
              }}
            >
              {isPlaying ? "LIVE" : "OFFLINE"}
            </Text>
          </View>

          <Text
            style={{
              color: colors.text.primary,
              fontSize: 34,
              fontWeight: "800",
              letterSpacing: -0.5,
            }}
          >
            Naat Radio
          </Text>
          <Text
            style={{
              color: colors.text.secondary,
              marginTop: 8,
              fontSize: 15,
              lineHeight: 24,
            }}
          >
            24/7 live naat streaming. Start the stream and keep listening while
            browsing the rest of the site.
          </Text>

          {error ? (
            <Text style={{ color: colors.accent.error, marginTop: 16 }}>
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={() => void (isPlaying ? pause() : play())}
            style={{
              marginTop: 28,
              alignSelf: "flex-start",
              paddingHorizontal: 22,
              paddingVertical: 14,
              borderRadius: 999,
              backgroundColor: isPlaying ? colors.accent.error : colors.accent.primary,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={20}
                color="#fff"
              />
            )}
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {isPlaying ? "Stop stream" : "Play stream"}
            </Text>
          </Pressable>
        </View>

        {/* Right: Visual */}
        <View
          style={{
            width: 320,
            height: 320,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Outer ring */}
          <View
            style={{
              position: "absolute",
              width: 320,
              height: 320,
              borderRadius: 160,
              borderWidth: 1.5,
              borderColor: colors.border.secondary,
              opacity: isPlaying ? 1 : 0.3,
            }}
          />
          {/* Middle ring */}
          <View
            style={{
              position: "absolute",
              width: 270,
              height: 270,
              borderRadius: 135,
              borderWidth: 1.5,
              borderColor: colors.accent.primary,
              opacity: isPlaying ? 0.3 : 0.1,
            }}
          />
          {/* Inner circle with image */}
          <View
            style={{
              width: 200,
              height: 200,
              borderRadius: 100,
              overflow: "hidden",
              backgroundColor: colors.background.tertiary,
              borderWidth: 2,
              borderColor: colors.background.elevated,
            }}
          >
            <Image
              source={require("@/assets/images/headphone-v1.png")}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          </View>
        </View>
      </View>
    </View>
  );
}
