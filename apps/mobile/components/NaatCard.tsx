import { colors } from "@/constants/theme";
import { NaatCardProps } from "@/types";
import { formatRelativeTime, formatViews } from "@/utils";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

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
      </View>

      {/* Content Section - With horizontal padding (YouTube style) */}
      <View className="pt-3 px-4">
        <View className="flex-row gap-3">
          {/* Channel Icon/Logo */}
          <View className="w-9 h-9 rounded-full bg-neutral-700 items-center justify-center flex-shrink-0">
            <Ionicons name="person" size={20} color="#a3a3a3" />
          </View>

          {/* Title and Metadata */}
          <View className="flex-1">
            {/* Title */}
            <Text
              className="text-sm font-medium leading-tight text-white mb-1"
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {title}
            </Text>

            {/* Channel name • Views • Upload date (single line) */}
            <Text className="text-xs text-neutral-400" numberOfLines={1}>
              {channelName || "Baghdadi Sound & Video"} · {formatViews(views)}{" "}
              views · {formatRelativeTime(uploadDate)}
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
