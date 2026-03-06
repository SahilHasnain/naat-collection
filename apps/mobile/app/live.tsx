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
  View
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
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', marginBottom: 150 }}
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
                className="text-white text-lg font-bold"
                numberOfLines={2}
              >
                {currentNaat.title}
              </Text>
            </View>
          </View>

          {/* Play/Pause Button */}
          <TouchableOpacity
            onPress={isPlaying ? handlePauseLive : handlePlayLive}
            className="items-center justify-center"
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.accent.error,
              alignSelf: 'center',
            }}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={32}
              color="white"
            />
          </TouchableOpacity>
        </View>

        {/* Up Next Section */}
        {upcomingNaats.length > 0 && (
          <View className="px-4 mb-6">
            <Text className="text-white text-lg font-bold mb-3">Up Next</Text>
            <View className="flex-row items-center">
              <View className="mr-3">
                <Ionicons name="radio" size={32} color={colors.accent.error} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-white text-sm font-semibold"
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
