import { colors } from "@/constants/theme";
import { formatRelativeTime, formatViews } from "@/utils";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

interface HistoryCardProps {
  title: string;
  thumbnail: string;
  duration: number;
  channelName: string;
  views: number;
  watchedAt: number;
  onPress: () => void;
}

const HistoryCard: React.FC<HistoryCardProps> = React.memo(
  ({ title, thumbnail, duration, channelName, views, watchedAt, onPress }) => {
    const [imageError, setImageError] = React.useState(false);

    return (
      <Pressable
        onPress={onPress}
        className="flex-row gap-3 overflow-hidden rounded-xl bg-neutral-800/50 border border-neutral-700/50"
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {/* Thumbnail Section - Square */}
        <View className="relative w-24 h-24 bg-neutral-900">
          {imageError || !thumbnail ? (
            <View className="h-full w-full items-center justify-center bg-neutral-700">
              <Text className="text-2xl">🎵</Text>
            </View>
          ) : (
            <Image
              source={{ uri: thumbnail }}
              style={{ width: 96, height: 96 }}
              contentFit="cover"
              onError={() => setImageError(true)}
              cachePolicy="memory-disk"
              transition={200}
            />
          )}

          {/* Duration badge */}
          <View
            className="absolute bottom-1 right-1 rounded px-1.5 py-0.5"
            style={{ backgroundColor: colors.overlay.dark }}
          >
            <Text className="text-[10px] font-bold text-white">
              {formatDuration(duration)}
            </Text>
          </View>
        </View>

        {/* Content Section */}
        <View className="flex-1 p-3 justify-between">
          {/* Title and timestamp */}
          <View>
            <Text
              className="text-sm font-semibold leading-tight text-white mb-1"
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            <Text className="text-xs text-neutral-400" numberOfLines={1}>
              {channelName}
            </Text>
          </View>

          {/* Bottom info */}
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] text-neutral-500">
              {formatViews(views)} views
            </Text>
            <Text className="text-[11px] text-neutral-300 font-medium">
              {formatRelativeTime(watchedAt)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }
);

HistoryCard.displayName = "HistoryCard";

export default HistoryCard;
