import Pressable from "@/components/ResponsivePressable";
import { layout } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FloatingFilterButtonProps {
  onPress: () => void;
  hasActiveFilters?: boolean;
  bottomOffset?: number;
}

export default function FloatingFilterButton({
  onPress,
  hasActiveFilters = false,
  bottomOffset = 16,
}: FloatingFilterButtonProps) {
  const insets = useSafeAreaInsets();
  const { translateY } = useTabBarVisibility();

  // Track the tab bar: sit above it when visible (translateY = 0) and slide
  // down with it (translateY > 0), but never go below the safe area so it
  // always rests just above the system navigation bar.
  const animatedStyle = useAnimatedStyle(() => ({
    bottom: Math.max(
      layout.tabBarHeight + insets.bottom + bottomOffset - translateY.value,
      insets.bottom + bottomOffset,
    ),
  }));

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Open filters"
        accessibilityHint="Opens filters to refine your naat feed"
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.92 : 1 }],
        })}
      >
        <LinearGradient
          colors={["#3b82f6", "#8b5cf6", "#ec4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Ionicons name="options-outline" size={24} color="#ffffff" />
          {hasActiveFilters && <View style={styles.activeDot} />}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    right: 16,
    zIndex: 50,
    borderRadius: 28,
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  gradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#f59e0b",
  },
});
