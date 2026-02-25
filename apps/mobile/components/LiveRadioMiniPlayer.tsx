/**
 * Live Radio Mini Player
 *
 * Dedicated mini player for live radio (separate from regular audio player)
 */

import { colors } from "@/constants/theme";
import { useLiveRadioPlayer } from "@/contexts/LiveRadioContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface LiveRadioMiniPlayerProps {
  onExpand: () => void;
}

const LiveRadioMiniPlayer: React.FC<LiveRadioMiniPlayerProps> = ({
  onExpand,
}) => {
  const { currentNaat, isPlaying, pause, play, stop } = useLiveRadioPlayer();
  const { translateY: tabBarTranslateY } = useTabBarVisibility();
  const insets = useSafeAreaInsets();

  // Animation for slide up/down
  const slideAnim = useSharedValue(100);

  useEffect(() => {
    if (currentNaat && isPlaying) {
      // Slide up
      slideAnim.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
    } else {
      // Slide down
      slideAnim.value = withSpring(100, {
        damping: 20,
        stiffness: 90,
      });
    }
  }, [currentNaat, isPlaying, slideAnim]);

  // Animated style that responds to both slide animation and tab bar position
  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    const TAB_BAR_HEIGHT = 56;
    const MINI_PLAYER_OFFSET_WHEN_HIDDEN = 0; // Space above system buttons when tab bar is hidden

    // Smoothly animate bottom position based on tab bar visibility
    // When tab bar is hidden (translateY > 0), position above system buttons
    // When tab bar is visible (translateY = 0), position above tab bar
    const targetBottom =
      tabBarTranslateY.value > 0
        ? insets.bottom + MINI_PLAYER_OFFSET_WHEN_HIDDEN // Above system buttons
        : TAB_BAR_HEIGHT + insets.bottom; // Above tab bar

    return {
      transform: [{ translateY: slideAnim.value }],
      bottom: withTiming(targetBottom, {
        duration: 300,
      }),
    };
  });

  // Animated style for background overlay - covers native buttons area
  const backgroundStyle = useAnimatedStyle(() => {
    "worklet";
    // Smoothly fade in/out background when tab bar is hidden
    const targetOpacity = tabBarTranslateY.value > 0 ? 1 : 0;

    return {
      opacity: withTiming(targetOpacity, {
        duration: 300,
      }),
    };
  });

  if (!currentNaat || !isPlaying) return null;

  return (
    <>
      {/* Background overlay - covers native buttons area when tab bar is hidden */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: insets.bottom + 20, // Covers native buttons area
            backgroundColor: colors.background.elevated,
            zIndex: 999,
          },
          backgroundStyle,
        ]}
      />

      {/* Live Radio Mini Player */}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            zIndex: 1000,
          },
          animatedStyle,
        ]}
      >
        <Pressable
          onPress={onExpand}
          className="border-t"
          style={{
            height: 72,
            backgroundColor: colors.background.secondary,
            borderTopColor: colors.border.secondary,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Live radio playing: ${currentNaat.title}. Double tap to expand.`}
        >
          {/* Live indicator bar */}
          <View className="absolute top-0 left-0 right-0 h-0.5 bg-red-500" />

          <View className="flex-row items-center h-full px-3">
            {/* Thumbnail */}
            <View
              className="mr-3 rounded-md overflow-hidden relative"
              style={{
                width: 64,
                height: 36,
                backgroundColor: colors.background.tertiary,
              }}
            >
              <Image
                source={{ uri: currentNaat.thumbnailUrl }}
                style={{ width: 64, height: 36 }}
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
    </>
  );
};

export default LiveRadioMiniPlayer;
