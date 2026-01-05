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
    <View className="flex-1 items-center justify-center px-8 py-20">
      {icon && <Text className="mb-6 text-7xl">{icon}</Text>}
      <Text className="mb-8 text-center text-lg leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-sm">
        {message}
      </Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          className="rounded-xl bg-primary-600 dark:bg-primary-500 px-8 py-4 active:bg-primary-700 dark:active:bg-primary-600 shadow-lg"
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
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
