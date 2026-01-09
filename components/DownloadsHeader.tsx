import { colors } from "@/constants/theme";
import { DownloadsHeaderProps } from "@/types";
import { formatFileSize } from "@/utils/formatters";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";

const DownloadsHeader: React.FC<DownloadsHeaderProps> = ({
  totalSize,
  downloadCount,
  onClearAll,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [animation] = useState(new Animated.Value(1));

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;

    Animated.spring(animation, {
      toValue,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();

    setIsExpanded(!isExpanded);
  };

  const maxHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const rotateChevron = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View
      className="px-4 py-4 bg-neutral-900 border-b border-neutral-800"
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel={`My Downloads. ${downloadCount} ${downloadCount === 1 ? "file" : "files"}. ${formatFileSize(totalSize)} used.`}
    >
      {/* Title Row with Collapse Button and Clear All */}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          onPress={toggleExpand}
          className="flex-row items-center flex-1"
          style={{ minHeight: 44 }}
          accessibilityRole="button"
          accessibilityLabel={`My Downloads. ${isExpanded ? "Collapse" : "Expand"} details`}
          accessibilityHint="Double tap to toggle storage information"
        >
          <Text
            className="text-xl font-bold text-white mr-2"
            accessible={false}
          >
            My Downloads
          </Text>
          <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.text.secondary}
            />
          </Animated.View>
        </Pressable>

        {onClearAll && downloadCount > 0 && (
          <Pressable
            onPress={onClearAll}
            className="flex-row items-center px-3 py-2 rounded-lg bg-neutral-800"
            style={{ minWidth: 44, minHeight: 44 }}
            accessibilityRole="button"
            accessibilityLabel="Clear all downloads"
            accessibilityHint="Double tap to delete all downloaded audio files"
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={colors.accent.error}
            />
            <Text className="ml-1.5 text-sm font-semibold text-red-500">
              Clear All
            </Text>
          </Pressable>
        )}
      </View>

      {/* Collapsible Storage Info */}
      <Animated.View
        style={{
          maxHeight,
          opacity: animation,
          overflow: "hidden",
        }}
      >
        <View
          className="flex-row items-center justify-between"
          accessible={false}
        >
          {/* Download Count */}
          <View className="flex-row items-center" accessible={false}>
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.background.elevated }}
              accessible={false}
            >
              <Ionicons
                name="musical-notes"
                size={20}
                color={colors.accent.primary}
              />
            </View>
            <View className="ml-3" accessible={false}>
              <Text
                className="text-2xl font-bold text-white"
                accessible={false}
              >
                {downloadCount}
              </Text>
              <Text className="text-xs text-neutral-400" accessible={false}>
                {downloadCount === 1 ? "Audio File" : "Audio Files"}
              </Text>
            </View>
          </View>

          {/* Storage Used */}
          <View className="flex-row items-center" accessible={false}>
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.background.elevated }}
              accessible={false}
            >
              <Ionicons
                name="server-outline"
                size={20}
                color={colors.accent.secondary}
              />
            </View>
            <View className="ml-3" accessible={false}>
              <Text
                className="text-2xl font-bold text-white"
                accessible={false}
              >
                {formatFileSize(totalSize)}
              </Text>
              <Text className="text-xs text-neutral-400" accessible={false}>
                Storage Used
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

export default DownloadsHeader;
