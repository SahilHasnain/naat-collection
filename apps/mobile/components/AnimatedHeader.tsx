import type { Channel, DurationOption, SortOption } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import SearchBar from "./SearchBar";

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
      className="absolute top-0 left-0 right-0 z-50 bg-neutral-800 border-b border-neutral-700"
    >
      <View className="px-4 pt-safe-top pb-3">
        <View className="flex-row items-center gap-3">
          {/* Logo */}
          <View
            className="rounded-full overflow-hidden bg-neutral-700"
            style={{ width: 40, height: 40 }}
          >
            <Image
              source={require("@/assets/images/android-icon-foreground.png")}
              style={{ width: 40, height: 40 }}
              contentFit="cover"
            />
          </View>

          {/* Search Bar */}
          <View className="flex-1">
            <SearchBar
              value={query}
              onChangeText={onChangeText}
              placeholder="Search naats..."
            />
          </View>

          {/* Filter Button */}
          <Pressable
            onPress={onFilterPress}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              hasActiveFilters ? "bg-blue-500" : "bg-neutral-700"
            }`}
            accessibilityLabel="Open filters"
            accessibilityRole="button"
          >
            <Ionicons
              name="filter"
              size={20}
              color={hasActiveFilters ? "white" : "#d4d4d8"}
            />
            {hasActiveFilters && (
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full border border-neutral-800" />
            )}
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
