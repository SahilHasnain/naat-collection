/**
 * Live Radio Mini Player
 *
 * Dedicated mini player for live radio (separate from regular audio player)
 */

import { colors } from "@/constants/theme";
import { useLiveRadioPlayer } from "@/contexts/LiveRadioContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface LiveRadioMiniPlayerProps {
  onExpand: () => void;
  networkIndicatorOffset: SharedValue<number>;
}

const LiveRadioMiniPlayer: React.FC<LiveRadioMiniPlayerProps> = ({
  onExpand,
  networkIndicatorOffset,
}) => {
  const { currentNaat, isPlaying, stop } = useLiveRadioPlayer();
  const { translateY: tabBarTranslateY } = useTabBarVisibility();
  const insets = useSafeAreaInsets();

  // Animation for slide up/down
  const slideAnim = useSharedValue(100);

  useEffect(() => {
    if (currentNaat && isPlaying) {
      // Slide up when playing
      slideAnim.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
    } else {
      // Slide down when not playing or no naat
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
    // When tab bar is visible (translateY = 0), position above tab bar + network indicator
    const targetBottom =
      tabBarTranslateY.value > 0
        ? insets.bottom + MINI_PLAYER_OFFSET_WHEN_HIDDEN // Above system buttons
        : TAB_BAR_HEIGHT + insets.bottom + networkIndicatorOffset.value; // Above tab bar + indicator

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
            backgroundColor: colors.background.primary,
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
          style={{
            height: 64,
            backgroundColor: colors.background.primary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Live radio playing: ${currentNaat.title}. Double tap to expand.`}
        >
          {/* Live indicator bar */}
          <View
            className="absolute top-0 left-0 right-0"
            style={{ height: 2, backgroundColor: "#ef4444" }}
          />

          <View className="flex-row items-center h-full px-4">
            {/* Radio Icon */}
            <View className="mr-3 items-center justify-center">
              <Ionicons name="radio" size={32} color={colors.accent.error} />
            </View>

            {/* Title */}
            <View className="flex-1 mr-3">
              <Text
                className="font-semibold text-sm"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ color: colors.text.primary }}
              >
                {currentNaat.title}
              </Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                stop();
              }}
              className="h-9 w-9 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Stop live radio"
            >
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Animated.View>
    </>
  );
};

export default LiveRadioMiniPlayer;
