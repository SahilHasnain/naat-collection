import { colors, shadows } from "@/constants/theme";
import { NaatCardProps } from "@/types";
import { formatRelativeTime, formatViews } from "@/utils";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
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
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

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
      <View className="relative w-full bg-neutral-900" style={{ height: 200 }}>
        {imageError || !thumbnail ? (
          <View className="h-full w-full items-center justify-center bg-neutral-700">
            <View className="items-center">
              <Ionicons name="musical-notes" size={48} color="#737373" />
              <Text className="text-sm font-medium text-neutral-400 mt-2">
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
              <View className="absolute inset-0 items-center justify-center bg-neutral-700">
                <Ionicons name="hourglass" size={32} color="#737373" />
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
              <Ionicons name="play" size={24} color="white" />
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
          <Ionicons
            name="person"
            size={14}
            color="#a3a3a3"
            style={{ marginRight: 6 }}
          />
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
            <Ionicons
              name="calendar-outline"
              size={14}
              color="#737373"
              style={{ marginRight: 6 }}
            />
            <Text className="text-xs text-neutral-400">
              {formatRelativeTime(uploadDate)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons
              name="eye-outline"
              size={14}
              color="#737373"
              style={{ marginRight: 6 }}
            />
            <Text className="text-xs text-neutral-400">
              {formatViews(views)} views
            </Text>
          </View>
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
    prevProps.channelName === nextProps.channelName &&
    prevProps.views === nextProps.views
    // Don't compare onPress - it's a function and will always be different
  );
};

export default React.memo(NaatCard, arePropsEqual);
