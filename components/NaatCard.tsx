import { colors, shadows } from "@/constants/theme";
import { NaatCardProps } from "@/types";
import { formatRelativeTime, formatViews } from "@/utils";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const NaatCard: React.FC<NaatCardProps> = React.memo(
  ({ title, thumbnail, duration, uploadDate, channelName, views, onPress }) => {
    const [imageError, setImageError] = React.useState(false);
    const [imageLoading, setImageLoading] = React.useState(true);

    // Debug: Log thumbnail URL
    React.useEffect(() => {
      console.log("Thumbnail URL:", thumbnail);
    }, [thumbnail]);

    return (
      <Pressable
        onPress={onPress}
        className="mb-5 overflow-hidden rounded-2xl bg-neutral-800 shadow-lg"
        style={({ pressed }) => ({
          ...shadows.md,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {/* Thumbnail Section with explicit 16:9 aspect ratio */}
        <View
          className="relative w-full bg-neutral-900"
          style={{ height: 200 }}
        >
          {imageError || !thumbnail ? (
            <View className="h-full w-full items-center justify-center bg-neutral-700">
              <View className="items-center">
                <Text className="text-5xl mb-2">🎵</Text>
                <Text className="text-sm font-medium text-neutral-400">
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
                onError={(error) => {
                  console.log("Image load error:", error);
                  setImageError(true);
                  setImageLoading(false);
                }}
                onLoad={() => {
                  console.log("Image loaded successfully");
                  setImageLoading(false);
                }}
                cachePolicy="memory-disk"
                transition={300}
              />
              {/* Loading indicator */}
              {imageLoading && (
                <View className="absolute inset-0 items-center justify-center bg-neutral-700">
                  <Text className="text-2xl">⏳</Text>
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
            <Text className="text-xs font-bold text-white tracking-wider">
              {formatDuration(duration)}
            </Text>
          </View>

          {/* Play icon overlay hint */}
          {!imageLoading && !imageError && (
            <View
              className="absolute inset-0 items-center justify-center"
              pointerEvents="none"
            >
              <View
                className="h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.overlay.light }}
              >
                <Text className="text-2xl">▶️</Text>
              </View>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View className="p-4 space-y-2">
          {/* Title */}
          <Text
            className="text-base font-bold leading-tight text-white"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {title}
          </Text>

          {/* Channel name with icon */}
          <View className="flex-row items-center">
            <Text className="mr-1.5 text-neutral-400">👤</Text>
            <Text
              className="flex-1 text-sm font-semibold text-neutral-300"
              numberOfLines={1}
            >
              {channelName || "Baghdadi Sound & Video"}
            </Text>
          </View>

          {/* Upload date and views */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="mr-1.5 text-neutral-500">📅</Text>
              <Text className="text-xs text-neutral-400">
                {formatRelativeTime(uploadDate)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="mr-1.5 text-neutral-500">👁️</Text>
              <Text className="text-xs text-neutral-400">
                {formatViews(views)} views
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }
);

NaatCard.displayName = "NaatCard";

export default NaatCard;
