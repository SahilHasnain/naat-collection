import { colors, shadows } from "@/constants/theme";
import { DownloadedAudioCardProps } from "@/types";
import { formatDownloadDate, formatFileSize } from "@/utils/formatters";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";

const DownloadedAudioCard: React.FC<DownloadedAudioCardProps> = React.memo(
  ({ audio, onPress, onDelete }) => {
    const [imageError, setImageError] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);

    // Animation values
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    // Generate thumbnail URL from YouTube ID
    const thumbnailUrl = `https://img.youtube.com/vi/${audio.youtubeId}/mqdefault.jpg`;

    // Animate press feedback
    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: isPressed ? 0.97 : 1,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    }, [isPressed, scaleAnim]);

    return (
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        <Pressable
          onPress={onPress}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          className="mb-4 overflow-hidden rounded-2xl bg-neutral-800 shadow-lg"
          style={shadows.md}
          accessibilityRole="button"
          accessibilityLabel={`Play ${audio.title}`}
          accessibilityHint="Double tap to play this downloaded audio"
          accessibilityState={{ disabled: false }}
          accessible={true}
        >
          <View className="flex-row">
            {/* Thumbnail Section */}
            <View
              className="relative bg-neutral-900"
              style={{ width: 120, height: 120 }}
              accessible={false}
            >
              {imageError || !audio.youtubeId ? (
                <View className="h-full w-full items-center justify-center bg-neutral-700">
                  <Text className="text-3xl" accessible={false}>
                    🎵
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: thumbnailUrl }}
                  style={{ width: 120, height: 120 }}
                  contentFit="cover"
                  onError={() => setImageError(true)}
                  cachePolicy="memory-disk"
                  transition={200}
                  accessible={false}
                  accessibilityIgnoresInvertColors={true}
                />
              )}

              {/* Downloaded indicator badge */}
              <View
                className="absolute bottom-1.5 left-1.5 rounded-md px-2 py-1"
                style={{ backgroundColor: colors.overlay.dark }}
                accessible={false}
              >
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
              </View>
            </View>

            {/* Content Section */}
            <View className="flex-1 p-3 justify-between" accessible={false}>
              {/* Title */}
              <Text
                className="text-sm font-bold leading-tight text-white mb-1"
                numberOfLines={2}
                ellipsizeMode="tail"
                accessible={false}
              >
                {audio.title}
              </Text>

              {/* Metadata */}
              <View className="space-y-1" accessible={false}>
                {/* Download date */}
                <View className="flex-row items-center" accessible={false}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={colors.text.secondary}
                  />
                  <Text
                    className="ml-1.5 text-xs text-neutral-400"
                    accessible={false}
                  >
                    {formatDownloadDate(audio.downloadedAt)}
                  </Text>
                </View>

                {/* File size */}
                <View className="flex-row items-center" accessible={false}>
                  <Ionicons
                    name="document-outline"
                    size={12}
                    color={colors.text.secondary}
                  />
                  <Text
                    className="ml-1.5 text-xs text-neutral-400"
                    accessible={false}
                  >
                    {formatFileSize(audio.fileSize)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Delete Button */}
            <View className="justify-center pr-3" accessible={false}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-10 w-10 items-center justify-center rounded-full bg-neutral-700"
                style={{ minWidth: 44, minHeight: 44 }}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${audio.title}`}
                accessibilityHint="Double tap to delete this downloaded audio"
                accessible={true}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={colors.accent.error}
                />
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

DownloadedAudioCard.displayName = "DownloadedAudioCard";

export default DownloadedAudioCard;
