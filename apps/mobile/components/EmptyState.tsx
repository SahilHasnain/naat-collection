import { colors, shadows } from "@/constants/theme";
import { EmptyStateProps } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon,
  iconName,
  actionLabel,
  onAction,
}) => {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      {iconName && (
        <Ionicons
          name={iconName}
          size={64}
          color="#737373"
          style={{ marginBottom: 24 }}
        />
      )}
      {!iconName && icon && <Text className="mb-6 text-7xl">{icon}</Text>}
      <Text className="mb-8 text-center text-lg leading-relaxed text-neutral-400 max-w-sm">
        {message}
      </Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          className="rounded-xl px-8 py-4 shadow-lg"
          style={{
            backgroundColor: colors.accent.secondary,
            ...shadows.md,
          }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text className="text-base font-bold text-white tracking-wide">
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export default EmptyState;
