import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Pressable from "./ResponsivePressable";

interface LayoutModeHintProps {
  onDismiss: () => void;
}

export function LayoutModeHint({ onDismiss }: LayoutModeHintProps) {
  const progress = useSharedValue(0);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 350 });
    autoDismissTimer.current = setTimeout(onDismiss, 6000);
    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, [progress, onDismiss]);

  const caretStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: "45deg" },
      { scale: withDelay(150, withTiming(progress.value, { duration: 250 })) },
    ],
    opacity: progress.value,
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOutUp.duration(250)}
      className="absolute right-4 z-50"
      style={{ top: 68 }}
      pointerEvents="box-none"
    >
      {/* Caret pointing to the header toggle button */}
      <Animated.View
        style={[
          caretStyle,
          {
            position: "absolute",
            top: -5,
            right: 14,
            width: 10,
            height: 10,
            backgroundColor: colors.background.tertiary,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderColor: colors.border.primary,
          },
        ]}
      />

      <View
        className="rounded-2xl p-4"
        style={[
          styles.card,
          {
            backgroundColor: colors.background.tertiary,
            borderColor: colors.border.primary,
          },
        ]}
      >
        <View className="flex-row items-start">
          <View
            className="mr-3 rounded-full"
            style={{ backgroundColor: colors.accent.primary + "26" }}
          >
            <Ionicons
              name="albums-outline"
              size={22}
              color={colors.accent.primary}
              style={{ padding: 9 }}
            />
          </View>

          <View className="flex-1">
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.text.primary }}
            >
              Try the new layout
            </Text>
            <Text
              className="mt-1 text-xs leading-4"
              style={{ color: colors.text.secondary }}
            >
              Tap the{" "}
              <Text style={{ color: colors.accent.primary }}>
                grid / list icon
              </Text>{" "}
              in the top bar to switch between the Grid and YouTube-style
              views.
            </Text>

            <View className="mt-3 flex-row items-center justify-between">
              <Pressable
                onPress={onDismiss}
                className="rounded-full px-4 py-1.5"
                style={{ backgroundColor: colors.accent.primary }}
                accessibilityLabel="Got it"
                accessibilityRole="button"
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: colors.text.primary }}
                >
                  Got it
                </Text>
              </Pressable>
              <Text
                className="text-[10px]"
                style={{ color: colors.text.tertiary }}
              >
                Shows once
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
  },
});
