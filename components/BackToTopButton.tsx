import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, Pressable } from "react-native";

interface BackToTopButtonProps {
  visible: boolean;
  onPress: () => void;
}

export default function BackToTopButton({
  visible,
  onPress,
}: BackToTopButtonProps) {
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{ opacity }}
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
