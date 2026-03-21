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
    <View>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={260}
        className="mb-4"
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          className="relative w-full"
          style={{ height: 200, backgroundColor: colors.background.tertiary }}
        >
          {imageError || !thumbnail ? (
            <View
              className="items-center justify-center w-full h-full"
              style={{ backgroundColor: colors.background.tertiary }}
            >
              <View className="items-center">
                <View
                  className="p-3 rounded-full"
                  style={{ backgroundColor: colors.accent.primary + "20" }}
                >
                  <Image
                    source={require("@/assets/images/headphone-v1.png")}
                    style={{ width: 48, height: 48 }}
                    contentFit="contain"
                  />
                </View>
                <Text
                  className="mt-2 text-sm font-medium"
                  style={{ color: colors.text.tertiary }}
                >
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
              {imageLoading && (
                <View
                  className="absolute inset-0 items-center justify-center"
                  style={{ backgroundColor: colors.background.tertiary }}
                >
                  <Ionicons name="hourglass" size={32} color="#717171" />
                </View>
              )}
              {!imageLoading && (
                <View
                  className="absolute inset-0"
                  style={{ backgroundColor: "transparent" }}
                  pointerEvents="none"
                />
              )}
            </>
          )}

          <View
            className="absolute bottom-2.5 right-2.5 rounded-lg px-3 py-1.5"
            style={{ backgroundColor: colors.overlay.dark }}
          >
            <Text
              className="text-xs font-bold tracking-wider"
              style={{ color: colors.text.primary }}
            >
              {formatDuration(duration)}
            </Text>
          </View>

          {isCut && (
            <View
              className="absolute top-2.5 right-2.5 rounded-full w-7 h-7 items-center justify-center"
              style={{ backgroundColor: colors.accent.primary }}
            >
              <Ionicons name="cut-outline" size={14} color="#fff" />
            </View>
          )}
        </View>

        <View className="px-2 pt-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <View className="mb-1.5">
                <Text
                  className="text-sm font-medium leading-tight"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ color: colors.text.primary }}
                >
                  {title}
                </Text>
              </View>

              <View className="flex-row justify-end">
                <Text
                  className="text-xs"
                  style={{ color: colors.text.secondary }}
                  numberOfLines={1}
                >
                  {formatViews(views)} views · {formatRelativeTime(uploadDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
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
