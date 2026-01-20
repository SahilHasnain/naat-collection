import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, Pressable } from "react-native";

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
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  React.useEffect(() => {
    // MiniPlayer height is 72px
    // We want to shift the button up by 72px when miniplayer is visible
    Animated.spring(translateY, {
      toValue: miniPlayerVisible ? -72 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [miniPlayerVisible, translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
      className="absolute bottom-6 right-6 z-50"
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
