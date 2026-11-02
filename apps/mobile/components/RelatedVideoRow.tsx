import { colors } from "@/constants/theme";
import type { MenuAnchor, Naat } from "@/types";
import { formatViews } from "@/utils";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";
import KebabMenuButton from "./KebabMenuButton";
import Pressable from "./ResponsivePressable";

const THUMBNAIL_WIDTH = 148;

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

interface RelatedVideoRowProps {
  naat: Naat;
  onPress: () => void;
  onMenuPress?: (anchor: MenuAnchor) => void;
}

/**
 * Compact YouTube-style row used by the "Related" list in video mode.
 */
export function RelatedVideoRow({
  naat,
  onPress,
  onMenuPress,
}: RelatedVideoRowProps) {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);
  const duration = naat.duration;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row"
      accessibilityRole="button"
      accessibilityLabel={`Play ${naat.title}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        className="overflow-hidden rounded-lg"
        style={{
          width: THUMBNAIL_WIDTH,
          aspectRatio: 16 / 9,
          backgroundColor: colors.background.tertiary,
        }}
      >
        {imageError || !naat.thumbnailUrl ? (
          <View className="h-full w-full items-center justify-center">
            <Ionicons
              name="musical-notes"
              size={28}
              color={colors.text.tertiary}
            />
          </View>
        ) : (
          <>
            <Image
              source={{ uri: naat.thumbnailUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              onLoad={() => setImageLoading(false)}
            />
            {imageLoading && (
              <View className="absolute inset-0 items-center justify-center">
                <Ionicons
                  name="hourglass"
                  size={20}
                  color={colors.text.tertiary}
                />
              </View>
            )}
          </>
        )}

        {duration > 0 && (
          <View
            className="absolute bottom-1 right-1 rounded px-1.5 py-0.5"
            style={{ backgroundColor: colors.overlay.dark }}
          >
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
              {formatDuration(duration)}
            </Text>
          </View>
        )}
      </View>

      <View className="ml-3 flex-1 pt-0.5">
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={{
            color: colors.text.primary,
            fontSize: 13,
            fontWeight: "600",
            lineHeight: 17,
          }}
        >
          {naat.title}
        </Text>
        <Text
          numberOfLines={1}
          style={{ marginTop: 4, color: colors.text.tertiary, fontSize: 11 }}
        >
          {formatViews(naat.views)} views
        </Text>
      </View>
      {onMenuPress && (
        <View className="justify-center pl-1">
          <KebabMenuButton
            onPress={onMenuPress}
            size={16}
            color={colors.text.secondary}
            backgroundColor={colors.background.tertiary}
          />
        </View>
      )}
    </Pressable>
  );
}

export default RelatedVideoRow;
