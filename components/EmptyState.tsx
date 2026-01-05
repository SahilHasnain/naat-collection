import { EmptyStateProps } from "@/types";
import React from "react";
import { Pressable, Text, View } from "react-native";

const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      {icon && <Text className="mb-4 text-6xl">{icon}</Text>}
      <Text className="mb-6 text-center text-base text-gray-600">
        {message}
      </Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          className="rounded-lg bg-blue-600 px-6 py-3 active:bg-blue-700"
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text className="font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

export default EmptyState;
