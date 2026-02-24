import type { Channel, DurationOption, SortOption } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  // Sort
  selectedSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  // Channel
  channels: Channel[];
  selectedChannelId: string | null;
  onChannelChange: (channelId: string | null) => void;
  channelsLoading?: boolean;
  // Duration
  selectedDuration: DurationOption;
  onDurationChange: (duration: DurationOption) => void;
}

export function FilterModal({
  visible,
  onClose,
  selectedSort,
  onSortChange,
  channels,
  selectedChannelId,
  onChannelChange,
  channelsLoading = false,
  selectedDuration,
  onDurationChange,
}: FilterModalProps) {
  const [activeTab, setActiveTab] = useState<"sort" | "channel" | "duration">(
    "sort",
  );

  const sortFilters: {
    value: SortOption;
    label: string;
    iconName: keyof typeof Ionicons.glyphMap;
  }[] = [
    { value: "forYou", label: "For You", iconName: "sparkles" },
    { value: "latest", label: "Latest", iconName: "time" },
    { value: "popular", label: "Popular", iconName: "flame" },
    { value: "oldest", label: "Oldest", iconName: "calendar" },
  ];

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

  // Separate channels into main and "other"
  const mainChannels = channels.filter((ch) => !ch.isOther);
  const otherChannels = channels.filter((ch) => ch.isOther);

  // Sort main channels alphabetically by name
  const sortedMainChannels = [...mainChannels].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // Create channel options with "All" first, then main channels, then "Other" if applicable
  const channelOptions: {
    id: string | null;
    name: string;
    iconName: keyof typeof Ionicons.glyphMap;
    type: "all" | "channel" | "other";
  }[] = [
    {
      id: null,
      name: "All",
      iconName: "globe",
      type: "all",
    },
    ...sortedMainChannels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      iconName: "tv" as keyof typeof Ionicons.glyphMap,
      type: "channel" as const,
    })),
  ];

  // Add "Other" option if there are other channels
  if (otherChannels.length > 0) {
    channelOptions.push({
      id: "other",
      name: "Other",
      iconName: "folder",
      type: "other",
    });
  }

  // Check if "Other" is selected
  const isOtherSelected =
    selectedChannelId !== null &&
    otherChannels.some((ch) => ch.id === selectedChannelId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/50" onPress={onClose}>
        <SafeAreaView
          edges={["bottom"]}
          className="absolute bottom-0 left-0 right-0"
        >
          <Pressable
            className="bg-neutral-800 rounded-t-3xl"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-neutral-700">
              <Text className="text-white text-lg font-bold">Filters</Text>
              <Pressable onPress={onClose}>
                <Text className="text-blue-500 text-base font-semibold">
                  Done
                </Text>
              </Pressable>
            </View>

            {/* Tabs */}
            <View className="flex-row border-b border-neutral-700">
              <Pressable
                onPress={() => setActiveTab("sort")}
                className={`flex-1 py-3 ${
                  activeTab === "sort" ? "border-b-2 border-blue-500" : ""
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    activeTab === "sort" ? "text-blue-500" : "text-neutral-400"
                  }`}
                >
                  Sort
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("channel")}
                className={`flex-1 py-3 ${
                  activeTab === "channel" ? "border-b-2 border-blue-500" : ""
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    activeTab === "channel"
                      ? "text-blue-500"
                      : "text-neutral-400"
                  }`}
                >
                  Channel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("duration")}
                className={`flex-1 py-3 ${
                  activeTab === "duration" ? "border-b-2 border-blue-500" : ""
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    activeTab === "duration"
                      ? "text-blue-500"
                      : "text-neutral-400"
                  }`}
                >
                  Duration
                </Text>
              </Pressable>
            </View>

            {/* Content */}
            <ScrollView
              className="max-h-96"
              showsVerticalScrollIndicator={false}
            >
              {activeTab === "sort" && (
                <View className="p-4">
                  {sortFilters.map((filter) => {
                    const isSelected = selectedSort === filter.value;
                    return (
                      <Pressable
                        key={filter.value}
                        onPress={() => {
                          onSortChange(filter.value);
                          onClose();
                        }}
                        className={`flex-row items-center p-4 rounded-lg mb-2 ${
                          isSelected ? "bg-blue-500" : "bg-neutral-700"
                        }`}
                      >
                        <Ionicons
                          name={filter.iconName}
                          size={20}
                          color="white"
                        />
                        <Text
                          className={`flex-1 font-semibold ml-3 ${
                            isSelected ? "text-white" : "text-neutral-300"
                          }`}
                        >
                          {filter.label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color="white" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {activeTab === "channel" && (
                <View className="p-4">
                  {channelOptions.map((option) => {
                    const isSelected =
                      option.type === "other"
                        ? isOtherSelected
                        : selectedChannelId === option.id;

                    return (
                      <Pressable
                        key={option.id || "all"}
                        onPress={() => {
                          if (
                            option.type === "other" &&
                            otherChannels.length > 0
                          ) {
                            // Select the first "other" channel
                            onChannelChange(otherChannels[0].id);
                          } else {
                            onChannelChange(option.id);
                          }
                          onClose();
                        }}
                        disabled={channelsLoading}
                        className={`flex-row items-center p-4 rounded-lg mb-2 ${
                          isSelected ? "bg-blue-500" : "bg-neutral-700"
                        }`}
                      >
                        <Ionicons
                          name={option.iconName}
                          size={20}
                          color="white"
                        />
                        <Text
                          className={`flex-1 font-semibold ml-3 ${
                            isSelected ? "text-white" : "text-neutral-300"
                          }`}
                        >
                          {option.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color="white" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {activeTab === "duration" && (
                <View className="p-4">
                  {durationFilters.map((filter) => {
                    const isSelected = selectedDuration === filter.value;
                    return (
                      <Pressable
                        key={filter.value}
                        onPress={() => {
                          onDurationChange(filter.value);
                          onClose();
                        }}
                        className={`flex-row items-center p-4 rounded-lg mb-2 ${
                          isSelected ? "bg-blue-500" : "bg-neutral-700"
                        }`}
                      >
                        <Ionicons
                          name={filter.iconName}
                          size={20}
                          color="white"
                        />
                        <Text
                          className={`flex-1 font-semibold ml-3 ${
                            isSelected ? "text-white" : "text-neutral-300"
                          }`}
                        >
                          {filter.label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color="white" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}
