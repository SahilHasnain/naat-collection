import { colors } from "@/constants/theme";
import { NaatCardProps } from "@/types";
import { formatViews } from "@/utils";
import { formatRelativeTime } from "@/utils/dateGrouping";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const NaatCard: React.FC<NaatCardProps> = ({
  title,
  thumbnail,
  duration,
  uploadDate,
  channelName,
  views,
  onPress,
  onDownload,
  isDownloaded,
  isDownloading,
  downloadProgress,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

  return (
    <Pressable
      onPress={onPress}
      className="mb-4"
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Thumbnail Section - Full width, no rounded corners (YouTube style) */}
      <View
        className="relative w-full"
        style={{ height: 200, backgroundColor: colors.background.tertiary }}
      >
        {imageError || !thumbnail ? (
          <View
            className="h-full w-full items-center justify-center"
            style={{ backgroundColor: colors.background.tertiary }}
          >
            <View className="items-center">
              <Ionicons name="musical-notes" size={48} color="#717171" />
              <Text
                className="text-sm font-medium mt-2"
                style={{ color: colors.text.tertiary }}
              >
                No Thumbnail
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Image
              source={{ uri: thumbnail }}
              style={{ width: "100%", height: 200 }}
              contentFit="cover"
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              onLoad={() => {
                setImageLoading(false);
              }}
              cachePolicy="memory-disk"
              transition={300}
            />
            {/* Loading indicator */}
            {imageLoading && (
              <View
                className="absolute inset-0 items-center justify-center"
                style={{ backgroundColor: colors.background.tertiary }}
              >
                <Ionicons name="hourglass" size={32} color="#717171" />
              </View>
            )}
            {/* Gradient overlay for better badge visibility */}
            {!imageLoading && (
              <View
                className="absolute inset-0"
                style={{
                  backgroundColor: "transparent",
                }}
                pointerEvents="none"
              />
            )}
          </>
        )}

        {/* Duration badge - enhanced design */}
        <View
          className="absolute bottom-2.5 right-2.5 rounded-lg px-3 py-1.5"
          style={{ backgroundColor: colors.overlay.dark }}
        >
          <Text
            className="text-xs font-bold tracking-wider"
            style={{ color: colors.text.primary }}
          >
            {formatDuration(duration)}
          </Text>
        </View>
      </View>

      {/* Content Section - With horizontal padding */}
      <View className="pt-3 px-4">
        <View className="flex-row gap-3">
          {/* Icon */}
          <View
            className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0"
            style={{ backgroundColor: colors.background.tertiary }}
          >
            <Ionicons
              name="musical-note"
              size={20}
              color={colors.text.secondary}
            />
          </View>

          {/* Title and Metadata */}
          <View className="flex-1">
            {/* Title */}
            <Text
              className="text-sm font-medium leading-tight mb-1.5"
              numberOfLines={2}
              ellipsizeMode="tail"
              style={{ color: colors.text.primary }}
            >
              {title}
            </Text>

            {/* Views • Upload date (aligned right) */}
            <View className="flex-row justify-end">
              <Text
                className="text-xs"
                style={{ color: colors.text.secondary }}
                numberOfLines={1}
              >
                {formatViews(views)} views · {formatRelativeTime(uploadDate)}
              </Text>
            </View>
          </View>

          {/* Download button */}
          {onDownload && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                if (!isDownloading) onDownload();
              }}
              className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0 self-center"
              style={{ backgroundColor: colors.background.tertiary }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={colors.accent.primary} />
              ) : (
                <Ionicons
                  name={isDownloaded ? "checkmark-circle" : "download-outline"}
                  size={20}
                  color={
                    isDownloaded ? colors.accent.primary : colors.text.secondary
                  }
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Pressable>
  );
};

NaatCard.displayName = "NaatCard";

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (
  prevProps: NaatCardProps,
  nextProps: NaatCardProps,
): boolean => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.thumbnail === nextProps.thumbnail &&
    prevProps.duration === nextProps.duration &&
    prevProps.uploadDate === nextProps.uploadDate &&
    prevProps.views === nextProps.views &&
    prevProps.isDownloaded === nextProps.isDownloaded &&
    prevProps.isDownloading === nextProps.isDownloading &&
    prevProps.downloadProgress === nextProps.downloadProgress
    // Don't compare onPress/onDownload - they're functions and will always be different
  );
};

export default React.memo(NaatCard, arePropsEqual);
