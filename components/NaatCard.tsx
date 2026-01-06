import { NaatCardProps } from "@/types";
import { formatRelativeTime } from "@/utils";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const NaatCard: React.FC<NaatCardProps> = React.memo(
  ({ title, thumbnail, duration, uploadDate, channelName, onPress }) => {
    const [imageError, setImageError] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);
    const [imageLoading, setImageLoading] = React.useState(true);

    // Debug: Log thumbnail URL
    React.useEffect(() => {
      console.log("Thumbnail URL:", thumbnail);
    }, [thumbnail]);

    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        className="mb-5 overflow-hidden rounded-2xl bg-white dark:bg-neutral-800 shadow-lg"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 5,
          transform: [{ scale: isPressed ? 0.97 : 1 }],
          opacity: isPressed ? 0.85 : 1,
        }}
      >
        {/* Thumbnail Section with explicit 16:9 aspect ratio */}
        <View
          className="relative w-full bg-neutral-100 dark:bg-neutral-900"
          style={{ height: 200 }}
        >
          {imageError || !thumbnail ? (
            <View className="h-full w-full items-center justify-center bg-neutral-200 dark:bg-neutral-700">
              <View className="items-center">
                <Text className="text-5xl mb-2">🎵</Text>
                <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
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
                <View className="absolute inset-0 items-center justify-center bg-neutral-200 dark:bg-neutral-700">
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
          <View className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/90 px-3 py-1.5">
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
              <View className="h-14 w-14 items-center justify-center rounded-full bg-black/30">
                <Text className="text-2xl">▶️</Text>
              </View>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View className="p-4 space-y-2">
          {/* Title */}
          <Text
            className="text-base font-bold leading-tight text-neutral-900 dark:text-white"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {title}
          </Text>

          {/* Channel name with icon */}
          <View className="flex-row items-center">
            <Text className="mr-1.5 text-neutral-500 dark:text-neutral-400">
              👤
            </Text>
            <Text
              className="flex-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300"
              numberOfLines={1}
            >
              {channelName || "Baghdadi Sound and Video"}
            </Text>
          </View>

          {/* Upload date with icon */}
          <View className="flex-row items-center">
            <Text className="mr-1.5 text-neutral-400 dark:text-neutral-500">
              📅
            </Text>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">
              {formatRelativeTime(uploadDate)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }
);

NaatCard.displayName = "NaatCard";

export default NaatCard;
