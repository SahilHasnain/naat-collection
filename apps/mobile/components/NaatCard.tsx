import { colors } from "@/constants/theme";
import { NaatCardProps } from "@/types";
import { formatViews } from "@/utils";
import { formatRelativeTime } from "@/utils/dateGrouping";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
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
  channelName,
  views,
  onPress,
  onDownload,
  isDownloaded,
  isDownloading,
  downloadProgress,
  isCut,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);
  const [showDownloadControls, setShowDownloadControls] = React.useState(false);

  // Animation values
  const downloadButtonScale = useSharedValue(0);
  const downloadButtonOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1);

  const handleLongPress = async () => {
    if (!onDownload) return;

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Show download controls
    setShowDownloadControls(true);

    // Animate card scale
    cardScale.value = withSpring(0.98, { damping: 15 });

    // Animate download button in
    downloadButtonScale.value = withSpring(1, { damping: 12 });
    downloadButtonOpacity.value = withTiming(1, { duration: 200 });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      hideDownloadControls();
    }, 3000);
  };

  const hideDownloadControls = () => {
    // Animate out
    cardScale.value = withSpring(1, { damping: 15 });
    downloadButtonScale.value = withSpring(0, { damping: 12 });
    downloadButtonOpacity.value = withTiming(0, { duration: 150 });

    // Hide after animation
    setTimeout(() => {
      setShowDownloadControls(false);
    }, 200);
  };

  const handleDownloadPress = async (e: any) => {
    e.stopPropagation();
    if (!isDownloading && onDownload) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDownload();
      hideDownloadControls();
    }
  };

  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const downloadButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: downloadButtonScale.value }],
    opacity: downloadButtonOpacity.value,
  }));

  return (
    <Animated.View style={cardAnimatedStyle}>
      <Pressable
        onPress={onPress}
        onLongPress={handleLongPress}
        className="mb-4"
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {/* Thumbnail Section - Full width, no rounded corners (YouTube style) */}
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
              {/* Loading indicator */}
              {imageLoading && (
                <View
                  className="absolute inset-0 items-center justify-center"
                  style={{ backgroundColor: colors.background.tertiary }}
                >
                  <Ionicons name="hourglass" size={32} color="#717171" />
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
            <Text
              className="text-xs font-bold tracking-wider"
              style={{ color: colors.text.primary }}
            >
              {formatDuration(duration)}
            </Text>
          </View>

          {/* Cut/trimmed indicator */}
          {isCut && (
            <View
              className="absolute top-2.5 right-2.5 rounded-full w-7 h-7 items-center justify-center"
              style={{ backgroundColor: colors.accent.primary }}
            >
              <Ionicons name="cut-outline" size={14} color="#fff" />
            </View>
          )}
        </View>

        {/* Content Section - With horizontal padding */}
        <View className="px-2 pt-3">
          <View className="flex-row gap-3">
            {/* Title and Metadata */}
            <View className="flex-1">
              {/* Title with placeholder icon */}
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

              {/* Views • Upload date OR Download hint */}
              <View className="flex-row justify-end">
                {showDownloadControls && onDownload ? (
                  <Text
                    className="text-xs font-medium"
                    style={{ color: colors.accent.primary }}
                  >
                    Tap to download
                  </Text>
                ) : (
                  <Text
                    className="text-xs"
                    style={{ color: colors.text.secondary }}
                    numberOfLines={1}
                  >
                    {formatViews(views)} views ·{" "}
                    {formatRelativeTime(uploadDate)}
                  </Text>
                )}
              </View>
            </View>

            {/* Animated Download Button */}
            {showDownloadControls && onDownload && (
              <Animated.View
                style={downloadButtonAnimatedStyle}
                className="self-center flex-shrink-0"
              >
                <TouchableOpacity
                  onPress={handleDownloadPress}
                  className="items-center justify-center w-10 h-10 rounded-full"
                  style={{ backgroundColor: colors.accent.primary }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isDownloading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.text.primary}
                    />
                  ) : (
                    <Ionicons
                      name={isDownloaded ? "checkmark" : "download"}
                      size={20}
                      color={colors.text.primary}
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
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
    prevProps.views === nextProps.views &&
    prevProps.isDownloaded === nextProps.isDownloaded &&
    prevProps.isDownloading === nextProps.isDownloading &&
    prevProps.downloadProgress === nextProps.downloadProgress &&
    prevProps.isCut === nextProps.isCut
    // Don't compare onPress/onDownload - they're functions and will always be different
  );
};

export default React.memo(NaatCard, arePropsEqual);
