import { colors } from "@/constants/theme";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
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

interface MiniPlayerProps {
  onExpand: () => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand }) => {
  const { currentAudio, isPlaying, togglePlayPause, stop, position, duration } =
    useAudioPlayer();

  // Animation for slide up/down
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (currentAudio) {
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
  }, [currentAudio, slideAnim]);

  if (!currentAudio) return null;

  // Calculate progress percentage
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        position: "absolute",
        bottom: 110, // Above tab bar (68px tab bar height)
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
        accessibilityLabel={`Now playing: ${currentAudio.title}. Double tap to expand player.`}
      >
        {/* Progress Bar */}
        <View className="absolute top-0 left-0 right-0 h-0.5 bg-neutral-700">
          <View
            className="h-full"
            style={{
              width: `${progress}%`,
              backgroundColor: colors.accent.primary,
            }}
          />
        </View>

        <View className="flex-row items-center h-full px-3">
          {/* Thumbnail */}
          <View
            className="mr-3 rounded-lg overflow-hidden bg-neutral-700"
            style={{ width: 56, height: 56 }}
          >
            <Image
              source={{ uri: currentAudio.thumbnailUrl }}
              style={{ width: 56, height: 56 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          </View>

          {/* Title and Channel */}
          <View className="flex-1 mr-3">
            {/* Live Badge */}
            {currentAudio.isLive && (
              <View className="flex-row items-center mb-1">
                <View className="w-2 h-2 bg-red-500 rounded-full mr-1.5" />
                <Text className="text-red-500 text-xs font-bold uppercase">
                  Live
                </Text>
              </View>
            )}
            <Text
              className="text-white font-semibold text-sm"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {currentAudio.title}
            </Text>
            <Text
              className="text-neutral-400 text-xs mt-0.5"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {currentAudio.channelName}
            </Text>
          </View>

          {/* Play/Pause Button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            className="h-10 w-10 items-center justify-center rounded-full bg-neutral-700 mr-2"
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={20}
              color="white"
            />
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              stop();
            }}
            className="h-10 w-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Close player"
          >
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default MiniPlayer;
