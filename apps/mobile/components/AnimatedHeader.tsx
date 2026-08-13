import { colors } from "@/constants/theme";
import { APP_NAME } from "@/config/brand";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import { Text, TextInput, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    type SharedValue,
} from "react-native-reanimated";
import Pressable from "./ResponsivePressable";

interface AnimatedHeaderProps {
  translateY: SharedValue<number>;
  isScrolledDown: SharedValue<boolean>;
  // Search mode props
  isSearchActive?: boolean;
  searchInput?: string;
  searchFocusNonce?: number;
  onSearchInputChange?: (text: string) => void;
  onSearchSubmit?: () => void;
  onSearchClose?: () => void;
}

export function AnimatedHeader({
  translateY,
  isScrolledDown,
  isSearchActive = false,
  searchInput = "",
  searchFocusNonce = 0,
  onSearchInputChange,
  onSearchSubmit,
  onSearchClose,
}: AnimatedHeaderProps) {
  const inputRef = useRef<TextInput>(null);

  // Auto-focus input when search mode activates or focus is re-requested
  useEffect(() => {
    if (isSearchActive) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isSearchActive, searchFocusNonce]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View
      style={[animatedStyle]}
      className="absolute top-0 left-0 right-0 z-50"
    >
      <View
        className="px-4 pt-safe-top pb-1"
        style={{ backgroundColor: colors.background.primary }}
      >
        {isSearchActive ? (
          /* Search Mode */
          <View className="flex-row items-center mb-3">
            {/* Back Button */}
            <Pressable
              onPress={onSearchClose}
              className="mr-3 items-center justify-center rounded-full"
              accessibilityLabel="Close search"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 36,
                height: 36,
                backgroundColor: colors.background.secondary,
              }}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.text.secondary}
              />
            </Pressable>

            {/* Search Input */}
            <View
              className="flex-1 flex-row items-center px-4 py-2.5 rounded-full border"
              style={{
                backgroundColor: colors.background.secondary,
                borderColor: colors.border.subtle,
              }}
            >
              <Ionicons
                name="search"
                size={18}
                color={colors.text.secondary}
                style={{ marginRight: 10 }}
              />
              <TextInput
                ref={inputRef}
                value={searchInput}
                onChangeText={onSearchInputChange}
                onSubmitEditing={onSearchSubmit}
                placeholder="Search naats..."
                placeholderTextColor={colors.text.secondary}
                className="flex-1 text-base"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={{ paddingVertical: 0, color: colors.text.primary }}
              />
              {searchInput.length > 0 && (
                <Pressable
                  onPress={() => onSearchInputChange?.("")}
                  className="items-center justify-center rounded-full"
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{
                    width: 24,
                    height: 24,
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.text.secondary}
                  />
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          /* Normal Mode */
          <View className="flex-row items-center mb-3">
            {/* Logo */}
            <View className="flex-row items-center gap-2">
              <View
                className="rounded-full overflow-hidden"
                style={{ width: 32, height: 32 }}
              >
                <Image
                  source={require("@/assets/images/android-icon-foreground.png")}
                  style={{ width: 32, height: 32 }}
                  contentFit="cover"
                />
              </View>
              <Text
                className="text-lg font-semibold"
                style={{ color: colors.text.primary }}
              >
                {APP_NAME}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
