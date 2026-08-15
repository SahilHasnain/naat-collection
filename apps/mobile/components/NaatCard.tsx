import { colors } from "@/constants/theme";
import { NaatCardProps } from "@/types";
import { formatViews } from "@/utils";
import { formatRelativeTime } from "@/utils/dateGrouping";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";
import KebabMenuButton from "./KebabMenuButton";
import Pressable from "./ResponsivePressable";

const YouTubeThumbnail: React.FC<{
  thumbnail: string;
  duration: number;
  imageError: boolean;
  imageLoading: boolean;
  onError: () => void;
  onLoad: () => void;
}> = ({ thumbnail, duration, imageError, imageLoading, onError, onLoad }) => (
  <View
    className="relative w-full bg-neutral-900"
    style={{ height: 200 }}
  >
    {imageError || !thumbnail ? (
      <View className="h-full w-full items-center justify-center bg-neutral-700">
        <View className="items-center">
          <Ionicons name="musical-notes" size={48} color="#737373" />
          <Text className="mt-2 text-sm font-medium text-neutral-400">
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
          onError={onError}
          onLoad={onLoad}
          cachePolicy="memory-disk"
          transition={300}
        />
        {imageLoading && (
          <View className="absolute inset-0 items-center justify-center bg-neutral-700">
            <Ionicons name="hourglass" size={32} color="#737373" />
          </View>
        )}
      </>
    )}

    <View
      className="absolute bottom-2.5 right-2.5 rounded-lg px-3 py-1.5"
      style={{ backgroundColor: colors.overlay.dark }}
    >
      <Text className="text-xs font-bold tracking-wider text-white">
        {formatDuration(duration)}
      </Text>
    </View>
  </View>
);

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
  onMenuPress,
  isCut,
  variant = "grid",
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

  const handleError = React.useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  const handleLoad = React.useCallback(() => {
    setImageLoading(false);
  }, []);

  if (variant === "youtube") {
    return (
      <Pressable
        onPress={onPress}
        delayLongPress={260}
        className="mb-4"
        style={({ pressed }) => ({
          opacity: pressed ? 0.72 : 1,
        })}
      >
        {/* Full-width thumbnail, no rounded corners (YouTube style) */}
        <YouTubeThumbnail
          thumbnail={thumbnail}
          duration={duration}
          imageError={imageError}
          imageLoading={imageLoading}
          onError={handleError}
          onLoad={handleLoad}
        />

        {/* Content Section - With horizontal padding (YouTube style) */}
        <View className="px-4 pt-3">
          <View className="flex-row gap-3">
            {/* Title and Metadata */}
            <View className="flex-1">
              <Text
                className="mb-1 text-sm font-medium leading-tight"
                numberOfLines={2}
                ellipsizeMode="tail"
                style={{ color: colors.text.primary }}
              >
                {title}
              </Text>

              <Text
                className="text-xs"
                numberOfLines={1}
                style={{ color: colors.text.secondary }}
              >
                {formatViews(views)} views · {formatRelativeTime(uploadDate)}
                {isCut && " • Pure"}
              </Text>
            </View>

            {/* Kebab menu */}
            {onMenuPress && (
              <View className="pt-0.5">
                <KebabMenuButton onPress={onMenuPress} />
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      delayLongPress={260}
      className="mb-4"
      style={({ pressed }) => ({
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View
        className="overflow-hidden"
        style={{
        }}
      >
        <View
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: 16 / 9,
            backgroundColor: colors.background.tertiary,
          }}
        >
          {imageError || !thumbnail ? (
            <View
              className="items-center justify-center w-full h-full"
              style={{ backgroundColor: colors.background.tertiary }}
            >
              <View className="items-center px-4">
                <View
                  className="p-3 rounded-full"
                  style={{ backgroundColor: colors.accent.primary + "20" }}
                >
                  <Image
                    source={require("@/assets/images/headphone-v1.png")}
                    style={{ width: 40, height: 40 }}
                    contentFit="contain"
                  />
                </View>
                <Text
                  className="mt-2 text-xs font-medium"
                  style={{ color: colors.text.tertiary }}
                >
                  Naat artwork unavailable
                </Text>
              </View>
            </View>
          ) : (
            <>
              <Image
                source={{ uri: thumbnail }}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                }}
                contentFit="cover"
                onError={handleError}
                onLoad={handleLoad}
                cachePolicy="memory-disk"
                transition={220}
              />
              {imageLoading && (
                <View
                  className="absolute inset-0 items-center justify-center"
                  style={{ backgroundColor: colors.background.tertiary }}
                >
                  <Ionicons
                    name="hourglass"
                    size={28}
                    color={colors.text.tertiary}
                  />
                </View>
              )}
              <View
                className="absolute inset-0"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.18)",
                }}
                pointerEvents="none"
              />
            </>
          )}

          <View
            className="absolute bottom-2 left-2 rounded-full px-2.5 py-1"
            style={{ backgroundColor: colors.overlay.dark }}
          >
            <Text
              className="text-[10px] font-bold tracking-wide"
              style={{ color: colors.text.primary }}
            >
              {formatDuration(duration)}
            </Text>
          </View>
        </View>

        <View className="px-3 pb-3 pt-2.5">
          <Text
            className="text-sm font-semibold leading-[18px]"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{ color: colors.text.primary, minHeight: 36 }}
          >
            {title}
          </Text>

          <View className="mt-2 flex-row items-center">
            <View className="flex-1">
              <Text
                className="text-[11px]"
                style={{ color: colors.text.secondary }}
                numberOfLines={1}
              >
                {formatRelativeTime(uploadDate)}
              </Text>
              <Text
                className="mt-0.5 text-[11px]"
                style={{ color: colors.text.tertiary }}
                numberOfLines={1}
              >
                {formatViews(views)} views{isCut && " • Pure"}
              </Text>
            </View>

            {/* Kebab menu */}
            {onMenuPress && (
              <View className="ml-1">
                <KebabMenuButton onPress={onMenuPress} size={16} />
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

NaatCard.displayName = "NaatCard";

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
    prevProps.downloadProgress === nextProps.downloadProgress &&
    prevProps.isCut === nextProps.isCut
  );
};

export default React.memo(NaatCard, arePropsEqual);

