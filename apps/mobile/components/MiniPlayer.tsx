import { colors } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
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

interface MiniPlayerProps {
  onExpand: () => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand }) => {
  const { currentAudio, isPlaying, togglePlayPause, stop, position, duration } =
    useAudioPlayer();
  const { translateY: tabBarTranslateY } = useTabBarVisibility();
  const insets = useSafeAreaInsets();

  // Animation for slide up/down when audio starts/stops
  const slideAnim = useSharedValue(100);

  useEffect(() => {
    if (currentAudio) {
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
  }, [currentAudio, slideAnim]);

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

  if (!currentAudio) return null;

  // Calculate progress percentage
  const progress = duration > 0 ? (position / duration) * 100 : 0;

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

      {/* Mini Player */}
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
          accessibilityLabel={`Now playing: ${currentAudio.title}. Double tap to expand player.`}
        >
          {/* Progress Bar */}
          <View
            className="absolute top-0 left-0 right-0"
            style={{ height: 2, backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <View
              className="h-full"
              style={{
                width: `${progress}%`,
                backgroundColor: colors.accent.primary,
              }}
            />
          </View>

          <View className="flex-row items-center h-full px-4">
            {/* Thumbnail */}
            <View
              className="mr-3 rounded-md overflow-hidden"
              style={{
                width: 64,
                height: 36,
                backgroundColor: colors.background.tertiary,
              }}
            >
              <Image
                source={{ uri: currentAudio.thumbnailUrl }}
                style={{ width: 64, height: 36 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            </View>

            {/* Title */}
            <View className="flex-1 mr-3">
              <Text
                className="font-semibold text-sm"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ color: colors.text.primary }}
              >
                {currentAudio.title}
              </Text>
            </View>

            {/* Play/Pause Button */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              className="h-9 w-9 items-center justify-center mr-2"
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? "Pause" : "Play"}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={24}
                color={colors.text.primary}
              />
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                stop();
              }}
              className="h-9 w-9 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Close player"
            >
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Animated.View>
    </>
  );
};

export default MiniPlayer;
