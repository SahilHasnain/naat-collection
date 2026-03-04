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
  Image,
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
   * Handle pause live radio
   */
  const handlePauseLive = async () => {
    await pause();
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background.primary }}
        edges={["top"]}
      >
        <ActivityIndicator size="large" color={colors.accent.error} />
        <Text className="text-white mt-4 text-base">Loading Live Radio...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !currentNaat) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: colors.background.primary }}
        edges={["top"]}
      >
        <Ionicons name="radio-outline" size={80} color={colors.text.disabled} />
        <Text className="text-white text-xl font-bold mt-4">
          Live Radio Unavailable
        </Text>
        <Text className="text-neutral-400 text-center mt-2">
          {error?.message || "Unable to load live radio"}
        </Text>
        <TouchableOpacity
          onPress={refresh}
          className="mt-6 px-6 py-3 rounded-full"
          style={{ backgroundColor: colors.accent.error }}
        >
          <Text className="text-white font-semibold">Try Again</Text>
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
      <ScrollView
        className="flex-1"
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
        {/* Header */}
        <View className="px-4 pt-4 pb-6">
          <Text className="text-2xl font-semibold text-white mb-4">
            Live Radio
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="w-2.5 h-2.5 rounded-full mr-2"
                style={{ backgroundColor: colors.accent.error }}
              />
              <Text
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: colors.accent.error }}
              >
                Live Now
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="people" size={18} color={colors.text.tertiary} />
              <Text className="text-neutral-400 text-xs ml-1.5">
                {listenerCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Current Track Card */}
        <View className="px-4 mb-6">
          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: colors.background.secondary }}
          >
            <View className="p-4">
              {/* Album Art - 16:9 aspect ratio */}
              <View className="mb-4">
                <Image
                  source={{ uri: currentNaat.thumbnailUrl }}
                  style={{ width: "100%", aspectRatio: 16 / 9 }}
                  className="rounded-xl"
                  resizeMode="cover"
                />
              </View>

              {/* Track Info */}
              <View className="mb-4">
                <Text
                  className="text-white text-lg font-bold mb-2"
                  numberOfLines={2}
                >
                  {currentNaat.title}
                </Text>
                <Text className="text-neutral-400 text-sm" numberOfLines={1}>
                  {currentNaat.channelName}
                </Text>
              </View>

              {/* Play/Pause Button */}
              <TouchableOpacity
                onPress={isPlaying ? handlePauseLive : handlePlayLive}
                className="py-3.5 rounded-full flex-row items-center justify-center"
                style={{
                  backgroundColor: isPlaying
                    ? colors.background.tertiary
                    : colors.accent.error,
                }}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={20}
                  color="white"
                />
                <Text className="text-white font-semibold text-base ml-2">
                  {isPlaying ? "Pause" : "Listen Live"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Up Next Section */}
        {upcomingNaats.length > 0 && (
          <View className="px-4 mb-6">
            <Text className="text-white text-lg font-bold mb-3">Up Next</Text>
            <View
              className="flex-row items-center rounded-xl p-3"
              style={{ backgroundColor: colors.background.secondary }}
            >
              <Image
                source={{ uri: upcomingNaats[0].thumbnailUrl }}
                style={{ width: 80, height: 45 }}
                className="rounded-lg mr-3"
                resizeMode="cover"
              />
              <View className="flex-1">
                <Text
                  className="text-white text-sm font-semibold mb-1"
                  numberOfLines={1}
                >
                  {upcomingNaats[0].title}
                </Text>
                <Text className="text-neutral-400 text-xs" numberOfLines={1}>
                  {upcomingNaats[0].channelName}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
