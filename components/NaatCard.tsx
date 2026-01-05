import { NaatCardProps } from "@/types";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const NaatCard: React.FC<NaatCardProps> = React.memo(
  ({ title, thumbnail, duration, uploadDate, reciterName, onPress }) => {
    const [imageError, setImageError] = React.useState(false);

    return (
      <Pressable
        onPress={onPress}
        className="mb-4 overflow-hidden rounded-xl bg-white dark:bg-neutral-800 shadow-md active:opacity-90 active:scale-[0.98]"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View className="relative">
          {imageError ? (
            <View className="h-48 w-full items-center justify-center bg-neutral-200 dark:bg-neutral-700">
              <Text className="text-4xl">🎵</Text>
              <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                No Image
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: thumbnail }}
              className="h-48 w-full"
              contentFit="cover"
              onError={() => setImageError(true)}
              cachePolicy="memory-disk"
              transition={200}
            />
          )}
          {/* Duration badge with improved contrast */}
          <View className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2.5 py-1.5">
            <Text className="text-xs font-bold text-white tracking-wide">
              {formatDuration(duration)}
            </Text>
          </View>
        </View>

        <View className="p-4">
          <Text
            className="mb-2 text-lg font-bold leading-snug text-neutral-900 dark:text-white"
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {reciterName}
          </Text>
          <Text className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            {new Date(uploadDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
      </Pressable>
    );
  }
);

NaatCard.displayName = "NaatCard";

export default NaatCard;
