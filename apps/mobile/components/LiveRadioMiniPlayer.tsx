/**
 * Live Radio Mini Player
 *
 * Dedicated mini player for live radio (separate from regular audio player)
 */

import { colors } from "@/constants/theme";
import { useLiveRadioPlayer } from "@/contexts/LiveRadioContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface LiveRadioMiniPlayerProps {
  onExpand: () => void;
}

const LiveRadioMiniPlayer: React.FC<LiveRadioMiniPlayerProps> = ({
  onExpand,
}) => {
  const { currentNaat, isPlaying, pause, play, stop } = useLiveRadioPlayer();

  // Animation for slide up/down
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (currentNaat && isPlaying) {
      // Slide up
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    } else {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 100,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    }
  }, [currentNaat, isPlaying, slideAnim]);

  if (!currentNaat || !isPlaying) return null;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        position: "absolute",
        bottom: 110,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      <Pressable
        onPress={onExpand}
        className="bg-neutral-800 border-t border-neutral-700"
        style={{ height: 72 }}
        accessibilityRole="button"
        accessibilityLabel={`Live radio playing: ${currentNaat.title}. Double tap to expand.`}
      >
        {/* Live indicator bar */}
        <View className="absolute top-0 left-0 right-0 h-0.5 bg-red-500" />

        <View className="flex-row items-center h-full px-3">
          {/* Thumbnail */}
          <View
            className="mr-3 rounded-lg overflow-hidden bg-neutral-700 relative"
            style={{ width: 56, height: 56 }}
          >
            <Image
              source={{ uri: currentNaat.thumbnailUrl }}
              style={{ width: 56, height: 56 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          </View>

          {/* Title and Channel */}
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <View className="w-2 h-2 bg-red-500 rounded-full mr-1.5 animate-pulse" />
              <Text className="text-red-500 text-xs font-bold uppercase">
                Live Radio
              </Text>
            </View>
            <Text
              className="text-white font-semibold text-sm"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {currentNaat.title}
            </Text>
            <Text
              className="text-neutral-400 text-xs mt-0.5"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {currentNaat.channelName}
            </Text>
          </View>

          {/* Pause Button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              pause();
            }}
            className="h-10 w-10 items-center justify-center rounded-full bg-neutral-700 mr-2"
            accessibilityRole="button"
            accessibilityLabel="Pause live radio"
          >
            <Ionicons name="pause" size={20} color="white" />
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              stop();
            }}
            className="h-10 w-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Stop live radio"
          >
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default LiveRadioMiniPlayer;
