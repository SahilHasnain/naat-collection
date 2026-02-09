import type { DurationOption } from "@naat-collection/shared";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

interface DurationFilterBarProps {
  selectedDuration: DurationOption;
  onDurationChange: (duration: DurationOption) => void;
}

const DurationFilterBar: React.FC<DurationFilterBarProps> = ({
  selectedDuration,
  onDurationChange,
}) => {
  const filters: { value: DurationOption; label: string; icon: string }[] = [
    { value: "all", label: "All", icon: "⏱️" },
    { value: "short", label: "< 5 min", icon: "⚡" },
    { value: "medium", label: "5-15 min", icon: "⏳" },
    { value: "long", label: "> 15 min", icon: "📺" },
  ];

  return (
    <View className="bg-neutral-800 border-b border-neutral-700">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        {filters.map((filter) => {
          const isSelected = selectedDuration === filter.value;
          return (
            <Pressable
              key={filter.value}
              onPress={() => onDurationChange(filter.value)}
              className={`mr-3 px-4 py-2 rounded-full flex-row items-center ${
                isSelected ? "bg-blue-500" : "bg-neutral-700"
              }`}
            >
              <Text className="mr-1.5">{filter.icon}</Text>
              <Text
                className={`font-semibold text-sm ${
                  isSelected ? "text-white" : "text-neutral-300"
                }`}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default DurationFilterBar;
