import { colors } from "@/constants/theme";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Pressable from "./ResponsivePressable";

interface MiniPlayerProps {
  onExpand: () => void;
  networkIndicatorOffset: SharedValue<number>;
}

const SIDEBAR_WIDTH = 224;

const WebMiniPlayer: React.FC<MiniPlayerProps> = ({
  onExpand,
  networkIndicatorOffset,
}) => {
  const {
    currentAudio,
    isPlaying,
    togglePlayPause,
    stop,
    position,
    duration,
    abRepeatPointA,
    abRepeatPointB,
  } = useAudioPlayer();

  // Animation for slide up/down when audio starts/stops
  const slideAnim = useSharedValue(100);

  useEffect(() => {
    slideAnim.value = currentAudio
      ? withSpring(0, { damping: 20, stiffness: 90 })
      : withSpring(100, { damping: 20, stiffness: 90 });
  }, [currentAudio, slideAnim]);

  // Animated style that responds to both slide animation and network indicator
  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ translateY: slideAnim.value }],
      // No bottom tab bar on web — sit flush above the network indicator
      bottom: withTiming(networkIndicatorOffset.value, { duration: 300 }),
    };
  });

  if (!currentAudio) return null;

  // Calculate progress percentage
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: SIDEBAR_WIDTH,
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
          borderTopWidth: 1,
          borderTopColor: colors.border.secondary,
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
          {duration > 0 && abRepeatPointA !== null && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: `${(abRepeatPointA / duration) * 100}%`,
                top: -2,
                width: 3,
                height: 6,
                backgroundColor: colors.accent.success,
              }}
            />
          )}
          {duration > 0 && abRepeatPointB !== null && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: `${(abRepeatPointB / duration) * 100}%`,
                top: -2,
                width: 3,
                height: 6,
                backgroundColor: colors.accent.error,
              }}
            />
          )}
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
  );
};

const MiniPlayer: React.FC<MiniPlayerProps> = (props) => {
  return <WebMiniPlayer {...props} />;
};

export default MiniPlayer;