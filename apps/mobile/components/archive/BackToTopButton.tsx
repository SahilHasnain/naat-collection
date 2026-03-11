import { colors } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Pressable from "../ResponsivePressable";

interface BackToTopButtonProps {
  visible: boolean;
  onPress: () => void;
  miniPlayerVisible?: boolean;
}

export default function BackToTopButton({
  visible,
  onPress,
  miniPlayerVisible = false,
}: BackToTopButtonProps) {
  const opacity = useSharedValue(0);
  const { translateY: tabBarTranslateY } = useTabBarVisibility();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    const TAB_BAR_HEIGHT = 68;
    const MINI_PLAYER_HEIGHT = 72;
    const BUTTON_MARGIN = 24; // 6 * 4 (bottom-6 in Tailwind)
    const MINI_PLAYER_OFFSET_WHEN_HIDDEN = 20;

    // Calculate bottom position based on tab bar and mini player visibility
    let bottomPosition = BUTTON_MARGIN + insets.bottom;

    // Add space for mini player if visible
    if (miniPlayerVisible) {
      bottomPosition += MINI_PLAYER_HEIGHT;
    }

    // Adjust for tab bar position
    if (tabBarTranslateY.value === 0) {
      // Tab bar is visible - add tab bar height
      bottomPosition += TAB_BAR_HEIGHT;
    } else if (tabBarTranslateY.value > 0) {
      // Tab bar is hidden - mini player moved down, so adjust accordingly
      if (miniPlayerVisible) {
        // Mini player is now lower, so button needs less offset
        bottomPosition =
          BUTTON_MARGIN +
          insets.bottom +
          MINI_PLAYER_OFFSET_WHEN_HIDDEN +
          MINI_PLAYER_HEIGHT;
      }
    }

    return {
      opacity: opacity.value,
      bottom: bottomPosition,
    };
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          right: 24, // 6 * 4 (right-6 in Tailwind)
          zIndex: 50,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        className="rounded-full w-14 h-14 items-center justify-center shadow-lg active:scale-95 active:opacity-90"
        style={{ backgroundColor: colors.accent.secondary }}
        accessibilityLabel="Scroll to top"
        accessibilityRole="button"
      >
        <Ionicons
          name="chevron-up-circle"
          size={46}
          color={colors.text.primary}
        />
      </Pressable>
    </Animated.View>
  );
}
