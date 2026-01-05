import { NaatCardProps } from "@/types";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const NaatCard: React.FC<NaatCardProps> = React.memo(
  ({ id, title, thumbnail, duration, uploadDate, reciterName, onPress }) => {
    const [imageError, setImageError] = React.useState(false);

    return (
      <Pressable
        onPress={onPress}
        className="mb-4 overflow-hidden rounded-lg bg-white shadow-sm active:opacity-80"
      >
        <View className="relative">
          {imageError ? (
            <View className="h-48 w-full items-center justify-center bg-gray-200">
              <Text className="text-gray-500">No Image</Text>
            </View>
          ) : (
            <Image
              source={{ uri: thumbnail }}
              className="h-48 w-full"
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          )}
          <View className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1">
            <Text className="text-xs font-semibold text-white">
              {formatDuration(duration)}
            </Text>
          </View>
        </View>

        <View className="p-4">
          <Text
            className="mb-1 text-base font-semibold text-gray-900"
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text className="text-sm text-gray-600">{reciterName}</Text>
          <Text className="mt-1 text-xs text-gray-500">
            {new Date(uploadDate).toLocaleDateString()}
          </Text>
        </View>
      </Pressable>
    );
  }
);

NaatCard.displayName = "NaatCard";

export default NaatCard;
