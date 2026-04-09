import { colors } from "@/constants/theme";
import { NaatCardProps } from "@/types";
import { formatViews } from "@/utils";
import { formatRelativeTime } from "@/utils/dateGrouping";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";
import Pressable from "./ResponsivePressable";

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
  views,
  onPress,
  onLongPress,
  isCut,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
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
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
                onLoad={() => {
                  setImageLoading(false);
                }}
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

          <View className="mt-2">
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

