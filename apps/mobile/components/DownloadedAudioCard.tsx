import { DownloadedAudioCardProps } from "@/types";
import { formatRelativeTime } from "@/utils/dateGrouping";
import { formatDuration } from "@/utils/formatters";
import { formatViews } from "@/utils/numberUtils";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

const DownloadedAudioCard: React.FC<DownloadedAudioCardProps> = React.memo(
  ({ audio, onPress, onDelete }) => {
    const [imageError, setImageError] = React.useState(false);

    // Generate thumbnail URL from YouTube ID
    const thumbnailUrl = `https://img.youtube.com/vi/${audio.youtubeId}/mqdefault.jpg`;

    // Format duration from seconds to MM:SS
    const duration = formatDuration(audio.duration);

    return (
      <Pressable
        onPress={onPress}
        className="flex-row py-3"
        accessibilityRole="button"
        accessibilityLabel={`Play ${audio.title}`}
        accessibilityHint="Double tap to play this downloaded audio"
        accessible={true}
      >
        {/* Thumbnail Section */}
        <View
          className="relative bg-neutral-900 rounded-lg overflow-hidden"
          style={{ width: 168, height: 94 }}
          accessible={false}
        >
          {imageError || !audio.youtubeId ? (
            <View className="h-full w-full items-center justify-center bg-neutral-700">
              <Ionicons name="musical-notes" size={32} color="#737373" />
            </View>
          ) : (
            <Image
              source={{ uri: thumbnailUrl }}
              style={{ width: 168, height: 94 }}
              contentFit="cover"
              onError={() => setImageError(true)}
              cachePolicy="memory-disk"
              transition={200}
              accessible={false}
              accessibilityIgnoresInvertColors={true}
            />
          )}

          {/* Duration overlay */}
          <View
            className="absolute bottom-1 right-1 rounded px-1 py-0.5"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
            accessible={false}
          >
            <Text className="text-xs font-semibold text-white">{duration}</Text>
          </View>
        </View>

        {/* Content Section */}
        <View className="flex-1 ml-3 justify-start" accessible={false}>
          {/* Title */}
          <Text
            className="text-sm font-normal leading-tight text-white mb-1.5"
            numberOfLines={2}
            ellipsizeMode="tail"
            accessible={false}
          >
            {audio.title}
          </Text>

          {/* Views and download time - aligned right */}
          <View className="flex-row justify-end items-end" accessible={false}>
            <Text className="text-xs text-neutral-400" accessible={false}>
              {formatViews(audio.views)} views · {formatRelativeTime(audio.downloadedAt)}
            </Text>
          </View>
        </View>

        {/* Delete Button */}
        <View className="justify-start pt-1" accessible={false}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-10 w-10 items-center justify-center"
            style={{ minWidth: 44, minHeight: 44 }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${audio.title}`}
            accessibilityHint="Double tap to delete this downloaded audio"
            accessible={true}
          >
            <Ionicons name="trash-outline" size={20} color="#aaaaaa" />
          </Pressable>
        </View>
      </Pressable>
    );
  },
);

DownloadedAudioCard.displayName = "DownloadedAudioCard";

export default DownloadedAudioCard;
