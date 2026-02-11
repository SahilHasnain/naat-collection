/**
 * Live Radio Screen
 *
 * 24/7 live naat radio with synchronized playback
 */

import { useAudioPlayer } from "@/contexts/AudioContext";
import { useLiveRadio } from "@/hooks/useLiveRadio";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
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
    liveState,
    getLiveMetadata,
    refresh,
  } = useLiveRadio();

  const { loadAndPlay, currentAudio, isPlaying, pause } = useAudioPlayer();

  const isPlayingLive = currentAudio?.isLive && isPlaying;

  /**
   * Handle play live radio
   */
  const handlePlayLive = async () => {
    if (!currentNaat) return;

    const metadata = await getLiveMetadata();
    if (!metadata || !metadata.currentNaat) return;

    // Load and play from the beginning (no position sync needed)
    await loadAndPlay({
      audioUrl: metadata.currentNaat.audioUrl,
      title: currentNaat.title,
      channelName: currentNaat.channelName,
      thumbnailUrl: currentNaat.thumbnailUrl,
      isLocalFile: false,
      audioId: currentNaat.$id,
      youtubeId: currentNaat.youtubeId,
      isLive: true,
    });
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
      {/* Header */}
      <View className="px-6 pt-16 pb-6">
        <View className="flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse" />
              <Text className="text-red-500 text-sm font-bold uppercase tracking-wider">
                Live Now
              </Text>
            </View>
            <Text className="text-white text-3xl font-bold mt-2">
              Naat Radio
            </Text>
          </View>
          <View className="items-center">
            <Ionicons name="people" size={24} color="#9ca3af" />
            <Text className="text-gray-400 text-sm mt-1">
              {listenerCount} listening
            </Text>
          </View>
        </View>
      </View>

      {/* Current Track */}
      <View className="px-6 mb-8">
        <View className="bg-gray-800 rounded-2xl overflow-hidden">
          {/* Album Art */}
          <View className="relative">
            <Image
              source={{ uri: currentNaat.thumbnailUrl }}
              className="w-full aspect-square"
              resizeMode="cover"
            />
            {/* Live Badge Overlay */}
            <View className="absolute top-4 left-4 bg-red-500 px-3 py-1.5 rounded-full flex-row items-center">
              <View className="w-2 h-2 bg-white rounded-full mr-2" />
              <Text className="text-white text-xs font-bold">LIVE</Text>
            </View>
          </View>

          {/* Track Info */}
          <View className="p-6">
            <Text className="text-white text-xl font-bold mb-2">
              {currentNaat.title}
            </Text>
            <Text className="text-gray-400 text-base mb-4">
              {currentNaat.channelName}
            </Text>

            {/* Play/Pause Button */}
            <TouchableOpacity
              onPress={isPlayingLive ? handlePauseLive : handlePlayLive}
              className={`${
                isPlayingLive ? "bg-gray-700" : "bg-red-500"
              } py-4 rounded-full flex-row items-center justify-center`}
            >
              <Ionicons
                name={isPlayingLive ? "pause" : "play"}
                size={24}
                color="white"
              />
              <Text className="text-white font-bold text-lg ml-2">
                {isPlayingLive ? "Pause" : "Listen Live"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Up Next Section */}
      {upcomingNaats.length > 0 && (
        <View className="px-6 mb-8">
          <Text className="text-white text-xl font-bold mb-4">Up Next</Text>
          {upcomingNaats.map((naat, index) => (
            <View
              key={naat.$id}
              className="flex-row items-center bg-gray-800 rounded-xl p-4 mb-3"
            >
              <View className="w-10 h-10 bg-gray-700 rounded-lg items-center justify-center mr-4">
                <Text className="text-gray-400 font-bold">{index + 1}</Text>
              </View>
              <Image
                source={{ uri: naat.thumbnailUrl }}
                className="w-14 h-14 rounded-lg mr-4"
              />
              <View className="flex-1">
                <Text className="text-white font-semibold" numberOfLines={1}>
                  {naat.title}
                </Text>
                <Text className="text-gray-400 text-sm" numberOfLines={1}>
                  {naat.channelName}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Info Section */}
      <View className="px-6 pb-32">
        <View className="bg-gray-800 rounded-xl p-6">
          <View className="flex-row items-center mb-4">
            <Ionicons name="information-circle" size={24} color="#ef4444" />
            <Text className="text-white text-lg font-bold ml-2">
              About Live Radio
            </Text>
          </View>
          <Text className="text-gray-400 leading-6">
            Enjoy 24/7 continuous naat playback. All listeners hear the same
            track at the same time, creating a shared spiritual experience.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
