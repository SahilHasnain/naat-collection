/**
 * Live Radio Screen
 *
 * 24/7 live naat radio with synchronized playback
 */

import { colors } from "@/constants/theme";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext.animated";
import { useLiveRadioPlayer } from "@/contexts/LiveRadioContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LiveScreen() {
  const {
    isLoading,
    error,
    currentNaat,
    upcomingNaats,
    listenerCount,
    isPlaying,
    play,
    pause,
    refresh,
  } = useLiveRadioPlayer();

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
  }, []);

  /**
   * Handle play live radio
   */
  const handlePlayLive = async () => {
    await play();
  };

  /**
   * Handle stop live radio (stops playback; next play will sync fresh)
   */
  const handleStopLive = async () => {
    await pause();
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView
        className="items-center justify-center flex-1"
        style={{ backgroundColor: colors.background.primary }}
        edges={["top"]}
      >
        <ActivityIndicator size="large" color={colors.accent.error} />
        <Text className="mt-4 text-base" style={{ color: colors.text.primary }}>
          Loading Live Radio...
        </Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !currentNaat) {
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
          Live Radio Unavailable
        </Text>
        <Text className="mt-2 text-center text-neutral-400">
          {error?.message || "Unable to load live radio"}
        </Text>
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
    <SafeAreaView
      className="flex-1 mt-2"
      style={{ backgroundColor: colors.background.primary }}
      edges={["top"]}
    >
      {/* Listener Count Badge - Top Right, below header */}
      {listenerCount > 0 && (
        <View className="flex-row justify-end px-4 pt-16">
          <View
            className="flex-row items-center px-3 py-1.5 rounded-full"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}
          >
            <Text
              className="text-sm font-semibold mr-1.5"
              style={{ color: colors.text.primary }}
            >
              {listenerCount}
            </Text>
            <Ionicons name="people" size={16} color={colors.accent.error} />
          </View>
        </View>
      )}

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
          {/* Radio Icon and Track Info - Inline */}
          <View className="flex-row items-center mb-4">
            <View className="mr-4">
              <Ionicons name="radio" size={64} color={colors.accent.error} />
            </View>
            <View className="flex-1">
              <Text
                className="text-lg font-bold"
                numberOfLines={2}
                style={{ color: colors.text.primary }}
              >
                {currentNaat.title}
              </Text>
            </View>
          </View>

          {/* Play/Pause Button */}
          <TouchableOpacity
            onPress={isPlaying ? handleStopLive : handlePlayLive}
            className="items-center justify-center"
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.accent.error,
              alignSelf: "center",
            }}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={32}
              color={colors.text.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Up Next Section */}
        {upcomingNaats.length > 0 && (
          <View className="px-4 mb-6">
            <Text
              className="mb-3 text-lg font-bold"
              style={{ color: colors.text.primary }}
            >
              Next
            </Text>
            <View className="flex-row items-center">
              <View className="mr-3">
                <Ionicons
                  name="play-skip-forward"
                  size={24}
                  color={colors.accent.error}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.text.primary }}
                  numberOfLines={2}
                >
                  {upcomingNaats[0].title}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
