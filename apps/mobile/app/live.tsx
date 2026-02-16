/**
 * Live Radio Screen
 *
 * 24/7 live naat radio with synchronized playback
 */

import { useLiveRadioPlayer } from "@/contexts/LiveRadioContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
      <View className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#ef4444" />
        <Text className="text-white mt-4 text-lg">Loading Live Radio...</Text>
      </View>
    );
  }

  // Error state
  if (error || !currentNaat) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-6">
        <Ionicons name="radio-outline" size={64} color="#6b7280" />
        <Text className="text-white text-xl font-bold mt-4">
          Live Radio Unavailable
        </Text>
        <Text className="text-gray-400 text-center mt-2">
          {error?.message || "Unable to load live radio"}
        </Text>
        <TouchableOpacity
          onPress={refresh}
          className="mt-6 bg-red-500 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-900"
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refresh}
          tintColor="#ef4444"
        />
      }
    >
      {/* Compact Header */}
      <View className="px-6 pt-12 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2 animate-pulse" />
            <Text className="text-red-500 text-xs font-bold uppercase tracking-wider">
              Live Now
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="people" size={18} color="#9ca3af" />
            <Text className="text-gray-400 text-xs ml-1.5">
              {listenerCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Compact Current Track Card */}
      <View className="px-6 mb-6">
        <View className="bg-gray-800 rounded-2xl overflow-hidden">
          {/* Horizontal Layout with Album Art and Info */}
          <View className="flex-row p-4">
            {/* Album Art - Smaller */}
            <View className="mr-4">
              <Image
                source={{ uri: currentNaat.thumbnailUrl }}
                style={{ width: 100, height: 100 }}
                className="rounded-xl"
                resizeMode="cover"
              />
            </View>

            {/* Track Info and Controls */}
            <View className="flex-1 justify-between">
              <View>
                <Text
                  className="text-white text-base font-bold mb-1"
                  numberOfLines={2}
                >
                  {currentNaat.title}
                </Text>
                <Text className="text-gray-400 text-sm" numberOfLines={1}>
                  {currentNaat.channelName}
                </Text>
              </View>

              {/* Play/Pause Button - Compact */}
              <TouchableOpacity
                onPress={isPlaying ? handlePauseLive : handlePlayLive}
                className={`${
                  isPlaying ? "bg-gray-700" : "bg-red-500"
                } py-2.5 rounded-full flex-row items-center justify-center mt-2`}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={18}
                  color="white"
                />
                <Text className="text-white font-semibold text-sm ml-1.5">
                  {isPlaying ? "Pause" : "Listen Live"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Up Next Section - Compact */}
      {upcomingNaats.length > 0 && (
        <View className="px-6 mb-6">
          <Text className="text-white text-base font-bold mb-3">Up Next</Text>
          {upcomingNaats.slice(0, 3).map((naat, index) => (
            <View
              key={naat.$id}
              className="flex-row items-center bg-gray-800 rounded-xl p-3 mb-2"
            >
              <View className="w-6 h-6 bg-gray-700 rounded items-center justify-center mr-3">
                <Text className="text-gray-400 text-xs font-bold">
                  {index + 1}
                </Text>
              </View>
              <Image
                source={{ uri: naat.thumbnailUrl }}
                style={{ width: 48, height: 48 }}
                className="rounded-lg mr-3"
              />
              <View className="flex-1">
                <Text
                  className="text-white text-sm font-semibold"
                  numberOfLines={1}
                >
                  {naat.title}
                </Text>
                <Text className="text-gray-400 text-xs" numberOfLines={1}>
                  {naat.channelName}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Info Section - Compact */}
      <View className="px-6 pb-24">
        <View className="bg-gray-800 rounded-xl p-4">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#ef4444" />
            <View className="flex-1 ml-3">
              <Text className="text-white text-sm font-semibold mb-1">
                About Live Radio
              </Text>
              <Text className="text-gray-400 text-xs leading-5">
                24/7 continuous naat playback. All listeners hear the same track
                simultaneously.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
