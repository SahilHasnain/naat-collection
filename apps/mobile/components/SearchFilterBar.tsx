import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { Channel, DurationOption } from "@naat-collection/shared";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const durationFilters: {
  value: DurationOption;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "all", label: "All", iconName: "infinite" },
  { value: "short", label: "< 5 min", iconName: "flash" },
  { value: "medium", label: "5-15 min", iconName: "hourglass" },
  { value: "long", label: "> 15 min", iconName: "film" },
];

interface SearchFilterBarProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onChannelChange: (channelId: string | null) => void;
  selectedDuration: DurationOption;
  onDurationChange: (duration: DurationOption) => void;
}

export function SearchFilterBar({
  channels,
  selectedChannelId,
  onChannelChange,
  selectedDuration,
  onDurationChange,
}: SearchFilterBarProps) {
  return (
    <View style={{ backgroundColor: colors.background.primary }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        {/* Channel Chips */}
        <Pressable
          onPress={() => onChannelChange(null)}
          className="mr-2 px-3 py-1.5 rounded-full flex-row items-center"
          style={{
            backgroundColor:
              selectedChannelId === null
                ? colors.accent.secondary
                : colors.background.tertiary,
          }}
        >
          <Ionicons
            name="globe"
            size={14}
            color={selectedChannelId === null ? "white" : "#d4d4d8"}
          />
          <Text
            className={`font-medium text-xs ml-1.5 ${
              selectedChannelId === null ? "text-white" : "text-neutral-300"
            }`}
          >
            All
          </Text>
        </Pressable>
        {channels
          .filter((ch) => !ch.isOther)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((channel) => (
            <Pressable
              key={channel.id}
              onPress={() => onChannelChange(channel.id)}
              className="mr-2 px-3 py-1.5 rounded-full flex-row items-center"
              style={{
                backgroundColor:
                  selectedChannelId === channel.id
                    ? colors.accent.secondary
                    : colors.background.tertiary,
              }}
            >
              <Text
                className={`font-medium text-xs ${
                  selectedChannelId === channel.id
                    ? "text-white"
                    : "text-neutral-300"
                }`}
                numberOfLines={1}
              >
                {channel.name}
              </Text>
            </Pressable>
          ))}

        {/* Divider */}
        <View
          style={{
            width: 1,
            backgroundColor: colors.background.tertiary,
            marginHorizontal: 6,
          }}
        />

        {/* Duration Chips */}
        {durationFilters.map((filter) => (
          <Pressable
            key={filter.value}
            onPress={() => onDurationChange(filter.value)}
            className="mr-2 px-3 py-1.5 rounded-full flex-row items-center"
            style={{
              backgroundColor:
                selectedDuration === filter.value
                  ? colors.accent.secondary
                  : colors.background.tertiary,
            }}
          >
            <Ionicons
              name={filter.iconName}
              size={14}
              color={selectedDuration === filter.value ? "white" : "#d4d4d8"}
            />
            <Text
              className={`font-medium text-xs ml-1.5 ${
                selectedDuration === filter.value
                  ? "text-white"
                  : "text-neutral-300"
              }`}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
