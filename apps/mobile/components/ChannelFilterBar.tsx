import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Channel } from "../types";

interface ChannelFilterBarProps {
  channels: Channel[];
  selectedChannelId: string | null; // null represents "All"
  onChannelChange: (channelId: string | null) => void;
  loading?: boolean;
}

const ChannelFilterBar: React.FC<ChannelFilterBarProps> = ({
  channels,
  selectedChannelId,
  onChannelChange,
  loading = false,
}) => {
  // Sort channels alphabetically by name
  const sortedChannels = [...channels].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Create filter options with "All" as first option
  const filterOptions = [
    { id: null, name: "All", icon: "🌐" },
    ...sortedChannels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      icon: "📺",
    })),
  ];

  return (
    <View className="bg-neutral-800 border-b border-neutral-700">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        {filterOptions.map((option) => {
          const isSelected = selectedChannelId === option.id;
          return (
            <Pressable
              key={option.id || "all"}
              onPress={() => onChannelChange(option.id)}
              className={`mr-3 px-4 py-2 rounded-full flex-row items-center ${
                isSelected ? "bg-blue-500" : "bg-neutral-700"
              }`}
              disabled={loading}
            >
              <Text className="mr-1.5">{option.icon}</Text>
              <Text
                className={`font-semibold text-sm ${
                  isSelected ? "text-white" : "text-neutral-300"
                }`}
              >
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default ChannelFilterBar;
