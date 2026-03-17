/**
 * Naat Radio Screen
 *
 * 24/7 naat radio with synchronized playback
 */

import { colors } from "@/constants/theme";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext.animated";
import { useLiveRadioPlayer } from "@/contexts/LiveRadioContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LiveScreen() {
  const { isLoading, error, isPlaying, play, pause, refresh } =
    useLiveRadioPlayer();

  const isBuffering = isLoading && !isPlaying;

  const { showTabBar } = useTabBarVisibility();
  const { showHeader } = useHeaderVisibility();

  // Force tab bar and header to show when this screen is focused
  useFocusEffect(
    useCallback(() => {
      // Show tab bar and header, reset scroll tracking state
      showTabBar();
      showHeader();
    }, [showTabBar, showHeader]),
  );

  // Load initial state
  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Handle play naat radio
   */
  const handlePlayLive = async () => {
    await play();
  };

  /**
   * Handle pause naat radio from live page
   */
  const handleStopLive = async () => {
    await pause(true); // Pass true to indicate pause from live page
  };

  // Error state
  if (error) {
    return (
      <SafeAreaView
        className="items-center justify-center flex-1 px-6"
        style={{ backgroundColor: colors.background.primary }}
        edges={["top"]}
      >
        <Ionicons name="radio-outline" size={80} color={colors.text.disabled} />
        <Text
          className="mt-4 text-xl font-bold"
          style={{ color: colors.text.primary }}
        >
          Naat Radio Unavailable
        </Text>
        <Text className="mt-2 text-center text-neutral-400">{error}</Text>
        <TouchableOpacity
          onPress={refresh}
          className="px-6 py-3 mt-6 rounded-full"
          style={{ backgroundColor: colors.accent.error }}
        >
          <Text
            className="font-semibold"
            style={{ color: colors.text.primary }}
          >
            Try Again
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("@/assets/images/gumbad.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Smooth gradient overlay */}
        <LinearGradient
          colors={[
            "rgba(15, 15, 15, 0.3)",
            "rgba(15, 15, 15, 0.55)",
            "rgba(15, 15, 15, 0.85)",
            colors.background.primary,
          ]}
          locations={[0, 0.35, 0.65, 0.9]}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView className="flex-1" edges={["top"]}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "flex-end",
              marginBottom: 150,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refresh}
                tintColor={colors.accent.error}
                colors={[colors.accent.error]}
              />
            }
          >
            {/* Current Track */}
            <View className="px-4 mb-6">
              {/* Headphone Image and Play Button - Inline */}
              <View className="flex-row items-center mb-4">
                <View className="mr-3">
                  <Image
                    source={require("@/assets/images/headphone-v1.png")}
                    style={{ width: 120, height: 120 }}
                    resizeMode="contain"
                  />
                </View>

                <View className="items-center justify-center flex-1 -ml-3">
                  {/* Play/Pause Button */}
                  <TouchableOpacity
                    onPress={isPlaying ? handleStopLive : handlePlayLive}
                    disabled={isBuffering}
                    className="items-center justify-center"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: "transparent",
                    }}
                  >
                    {isBuffering ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.text.primary}
                      />
                    ) : (
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={32}
                        color={colors.text.primary}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
