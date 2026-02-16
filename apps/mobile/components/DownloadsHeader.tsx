import { colors } from "@/constants/theme";
import { DownloadsHeaderProps } from "@/types";
import { formatFileSize } from "@/utils/formatters";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

const DownloadsHeader: React.FC<DownloadsHeaderProps> = ({
  totalSize,
  downloadCount,
  onClearAll,
}) => {
  return (
    <View
      className="px-4 py-4 bg-neutral-900"
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel={`My Downloads. ${downloadCount} ${downloadCount === 1 ? "file" : "files"}. ${formatFileSize(totalSize)} used.`}
    >
      {/* Title Row */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-bold text-white">Downloads</Text>
        {onClearAll && downloadCount > 0 && (
          <Pressable
            onPress={onClearAll}
            className="flex-row items-center px-3 py-1.5 rounded-full bg-neutral-800"
            style={{ minWidth: 44, minHeight: 36 }}
            accessibilityRole="button"
            accessibilityLabel="Clear all downloads"
            accessibilityHint="Double tap to delete all downloaded audio files"
          >
            <Ionicons
              name="trash-outline"
              size={14}
              color={colors.accent.error}
            />
            <Text className="ml-1.5 text-xs font-semibold text-red-500">
              Clear All
            </Text>
          </Pressable>
        )}
      </View>

      {/* Compact Storage Info */}
      {downloadCount > 0 && (
        <View className="flex-row items-center gap-6">
          {/* Download Count */}
          <View className="flex-row items-center">
            <Ionicons
              name="musical-notes"
              size={16}
              color={colors.accent.primary}
            />
            <Text className="text-sm text-neutral-400 ml-2">
              {downloadCount} {downloadCount === 1 ? "file" : "files"}
            </Text>
          </View>

          {/* Storage Used */}
          <View className="flex-row items-center">
            <Ionicons
              name="server-outline"
              size={16}
              color={colors.accent.secondary}
            />
            <Text className="text-sm text-neutral-400 ml-2">
              {formatFileSize(totalSize)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default DownloadsHeader;
