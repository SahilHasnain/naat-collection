import { colors } from "@/constants/theme";
import { formatViews } from "@/utils";
import { Ionicons } from "@expo/vector-icons";
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
        className="flex-row items-center gap-3 rounded-lg"
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          backgroundColor: colors.background.secondary,
        })}
      >
        {/* Thumbnail Section - 16:9 */}
        <View
          className="relative rounded-md overflow-hidden"
          style={{
            width: 140,
            height: 79,
            backgroundColor: colors.background.tertiary,
          }}
        >
          {imageError || !thumbnail ? (
            <View
              className="h-full w-full items-center justify-center"
              style={{ backgroundColor: colors.background.tertiary }}
            >
              <Ionicons name="musical-notes" size={28} color="#737373" />
            </View>
          ) : (
            <Image
              source={{ uri: thumbnail }}
              style={{ width: 140, height: 79 }}
              contentFit="cover"
              onError={() => setImageError(true)}
              cachePolicy="memory-disk"
              transition={200}
            />
          )}

          {/* Duration badge */}
          <View
            className="absolute bottom-1 right-1 rounded px-1.5 py-0.5"
            style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
          >
            <Text className="text-[10px] font-semibold text-white">
              {formatDuration(duration)}
            </Text>
          </View>
        </View>

        {/* Content Section */}
        <View className="flex-1 py-2 pr-3 justify-between">
          {/* Title and channel */}
          <View>
            <Text
              className="text-sm font-semibold leading-tight text-white mb-1"
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            <Text
              className="text-xs"
              style={{ color: colors.text.secondary }}
              numberOfLines={1}
            >
              {channelName}
            </Text>
          </View>

          {/* Bottom info */}
          <View className="flex-row items-center">
            <Text
              className="text-[11px]"
              style={{ color: colors.text.tertiary }}
            >
              {formatViews(views)} views
            </Text>
          </View>
        </View>
      </Pressable>
    );
  },
);

HistoryCard.displayName = "HistoryCard";

export default HistoryCard;
