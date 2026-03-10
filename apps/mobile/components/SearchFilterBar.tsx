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
  pureOnly?: boolean;
  onPureOnlyChange?: (value: boolean) => void;
}

export function SearchFilterBar({
  channels,
  selectedChannelId,
  onChannelChange,
  selectedDuration,
  onDurationChange,
  pureOnly = false,
  onPureOnlyChange,
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
        {/* Pure Toggle */}
        <Pressable
          onPress={() => onPureOnlyChange?.(!pureOnly)}
          className="mr-2 px-3 py-1.5 rounded-full flex-row items-center"
          style={{
            backgroundColor: pureOnly
              ? colors.accent.primary
              : colors.background.tertiary,
          }}
        >
          <Ionicons
            name="cut-outline"
            size={14}
            color={pureOnly ? "#fff" : "#d4d4d8"}
          />
          <Text
            className="font-medium text-xs ml-1.5"
            style={{ color: pureOnly ? "#fff" : "#d4d4d8" }}
          >
            Pure
          </Text>
        </Pressable>

        {/* Divider */}
        <View
          style={{
            width: 1,
            backgroundColor: colors.background.tertiary,
            marginHorizontal: 6,
          }}
        />

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
            color={selectedChannelId === null ? colors.text.primary : "#d4d4d8"}
          />
          <Text
            className={`font-medium text-xs ml-1.5`}
            style={{
              color:
                selectedChannelId === null ? colors.text.primary : "#d4d4d8",
            }}
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
                className={`font-medium text-xs`}
                numberOfLines={1}
                style={{
                  color:
                    selectedChannelId === channel.id
                      ? colors.text.primary
                      : "#d4d4d8",
                }}
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
              color={
                selectedDuration === filter.value
                  ? colors.text.primary
                  : "#d4d4d8"
              }
            />
            <Text
              className={`font-medium text-xs ml-1.5`}
              style={{
                color:
                  selectedDuration === filter.value
                    ? colors.text.primary
                    : "#d4d4d8",
              }}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
