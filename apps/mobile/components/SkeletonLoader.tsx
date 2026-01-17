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
      ])
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
    <View className="mb-4 overflow-hidden rounded-2xl bg-neutral-800 px-4">
      <View className="flex-row py-3">
        {/* Thumbnail skeleton */}
        <SkeletonLoader width={120} height={120} borderRadius={12} />

        {/* Content skeleton */}
        <View className="flex-1 ml-3 justify-between py-2">
          {/* Title skeleton */}
          <View>
            <SkeletonLoader
              width="90%"
              height={16}
              style={{ marginBottom: 8 }}
            />
            <SkeletonLoader width="70%" height={16} />
          </View>

          {/* Metadata skeleton */}
          <View>
            <SkeletonLoader
              width="60%"
              height={12}
              style={{ marginBottom: 6 }}
            />
            <SkeletonLoader width="40%" height={12} />
          </View>
        </View>

        {/* Delete button skeleton */}
        <View className="justify-center ml-2">
          <SkeletonLoader width={40} height={40} borderRadius={20} />
        </View>
      </View>
    </View>
  );
};
