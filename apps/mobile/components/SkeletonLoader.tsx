import { colors } from "@/constants/theme";
import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.background.elevated,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonDownloadCard: React.FC = () => {
  return (
    <View className="px-4 mb-3">
      <View className="flex-row py-3">
        {/* Thumbnail skeleton with duration overlay */}
        <View className="relative">
          <SkeletonLoader width={168} height={94} borderRadius={12} />
          {/* Duration overlay skeleton */}
          <View className="absolute bottom-1 right-1">
            <SkeletonLoader width={32} height={16} borderRadius={4} />
          </View>
        </View>

        {/* Content skeleton */}
        <View className="flex-1 ml-3 justify-start">
          {/* Title skeleton - 2 lines */}
          <SkeletonLoader width="95%" height={14} style={{ marginBottom: 4 }} />
          <SkeletonLoader width="75%" height={14} style={{ marginBottom: 8 }} />

          {/* Channel name with checkmark skeleton */}
          <View className="flex-row items-center mb-2">
            <SkeletonLoader width={14} height={14} borderRadius={7} />
            <SkeletonLoader width={100} height={12} style={{ marginLeft: 4 }} />
          </View>

          {/* Date skeleton */}
          <SkeletonLoader width={80} height={12} />
        </View>

        {/* Delete button skeleton - top aligned */}
        <View className="justify-start pt-1">
          <SkeletonLoader width={40} height={40} borderRadius={20} />
        </View>
      </View>
    </View>
  );
};
