import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export type SortOption = "forYou" | "latest" | "popular" | "oldest";

interface SortFilterBarProps {
  selectedFilter: SortOption;
  onFilterChange: (filter: SortOption) => void;
}

const SortFilterBar: React.FC<SortFilterBarProps> = ({
  selectedFilter,
  onFilterChange,
}) => {
  const filters: { value: SortOption; label: string; icon: string }[] = [
    { value: "forYou", label: "For You", icon: "✨" },
    { value: "latest", label: "Latest", icon: "🆕" },
    { value: "popular", label: "Popular", icon: "🔥" },
    { value: "oldest", label: "Oldest", icon: "📅" },
  ];

  return (
    <View className="bg-neutral-800 border-b border-neutral-700">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.value;
          return (
            <Pressable
              key={filter.value}
              onPress={() => onFilterChange(filter.value)}
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

export default SortFilterBar;
