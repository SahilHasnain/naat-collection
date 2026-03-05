import { colors } from "@/constants/theme";
import type { Channel, DurationOption, SortOption } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    type SharedValue,
} from "react-native-reanimated";

interface AnimatedHeaderProps {
  translateY: SharedValue<number>;
  isScrolledDown: SharedValue<boolean>;
  query: string;
  onChangeText: (text: string) => void;
  // Filter props
  selectedSort: SortOption;
  selectedChannelId: string | null;
  selectedDuration: DurationOption;
  channels: Channel[];
  onFilterPress: () => void;
  onSearchPress: () => void;
  disableFilter?: boolean; // Optional prop to disable filter button
}

export function AnimatedHeader({
  translateY,
  isScrolledDown,
  query,
  onChangeText,
  selectedSort,
  selectedChannelId,
  selectedDuration,
  channels,
  onFilterPress,
  onSearchPress,
  disableFilter = false,
}: AnimatedHeaderProps) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // Check if any non-default filters are active
  const hasActiveFilters =
    selectedSort !== "forYou" ||
    selectedChannelId !== null ||
    selectedDuration !== "all";

  return (
    <Animated.View
      style={[animatedStyle]}
      className="absolute top-0 left-0 right-0 z-50"
    >
      <View
        className="px-4 pt-safe-top pb-1"
        style={{ backgroundColor: colors.background.primary }}
      >
        {/* Top Row: Logo and Action Icons */}
        <View className="flex-row items-center justify-between mb-3">
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
            <Text className="text-white text-lg font-semibold">
              Owais Raza Qadri
            </Text>
          </View>

          {/* Action Icons */}
          <View className="flex-row items-center gap-4">
            {/* Search */}
            <Pressable
              onPress={onSearchPress}
              accessibilityLabel="Search"
              accessibilityRole="button"
            >
              <Ionicons name="search" size={24} color="white" />
            </Pressable>

            {/* Filter */}
            <Pressable
              onPress={onFilterPress}
              accessibilityLabel="Open filters"
              accessibilityRole="button"
              disabled={disableFilter}
              style={{ opacity: disableFilter ? 0.3 : 1 }}
            >
              <Ionicons
                name="options-outline"
                size={24}
                color={hasActiveFilters ? "#3b82f6" : "white"}
              />
              {hasActiveFilters && (
                <View className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
