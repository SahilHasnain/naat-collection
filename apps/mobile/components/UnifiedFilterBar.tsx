import type {
  Channel,
  DurationOption,
  SortOption,
} from "@naat-collection/shared";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

interface UnifiedFilterBarProps {
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

const UnifiedFilterBar: React.FC<UnifiedFilterBarProps> = ({
  selectedSort,
  onSortChange,
  channels,
  selectedChannelId,
  onChannelChange,
  channelsLoading = false,
  selectedDuration,
  onDurationChange,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"sort" | "channel" | "duration">(
    "sort",
  );

  const sortFilters: { value: SortOption; label: string; icon: string }[] = [
    { value: "forYou", label: "For You", icon: "✨" },
    { value: "latest", label: "Latest", icon: "🆕" },
    { value: "popular", label: "Popular", icon: "🔥" },
    { value: "oldest", label: "Oldest", icon: "📅" },
  ];

  const durationFilters: {
    value: DurationOption;
    label: string;
    icon: string;
  }[] = [
    { value: "all", label: "All", icon: "⏱️" },
    { value: "short", label: "< 5 min", icon: "⚡" },
    { value: "medium", label: "5-15 min", icon: "⏳" },
    { value: "long", label: "> 15 min", icon: "📺" },
  ];

  // Separate channels into main and "other"
  const mainChannels = channels.filter((ch) => !ch.isOther);
  const otherChannels = channels.filter((ch) => ch.isOther);

  // Sort main channels alphabetically by name
  const sortedMainChannels = [...mainChannels].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // Create channel options with "All" first, then main channels, then "Other" if applicable
  const channelOptions = [
    { id: null, name: "All", icon: "🌐", type: "all" as const },
    ...sortedMainChannels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      icon: "📺",
      type: "channel" as const,
    })),
  ];

  // Add "Other" option if there are other channels
  if (otherChannels.length > 0) {
    channelOptions.push({
      id: "other",
      name: "Other",
      icon: "📂",
      type: "other" as const,
    });
  }

  // Check if "Other" is selected (when selectedChannelId matches any other channel)
  const isOtherSelected =
    selectedChannelId !== null &&
    otherChannels.some((ch) => ch.id === selectedChannelId);

  // Get current selections for display
  const currentSort = sortFilters.find((f) => f.value === selectedSort);

  // Determine current channel display
  let currentChannel;
  if (isOtherSelected) {
    currentChannel = { id: "other", name: "Other", icon: "📂" };
  } else {
    currentChannel = channelOptions.find((c) => c.id === selectedChannelId);
  }

  const currentDuration = durationFilters.find(
    (f) => f.value === selectedDuration,
  );

  // Check if any non-default filters are active
  const hasActiveFilters =
    selectedSort !== "forYou" ||
    selectedChannelId !== null ||
    selectedDuration !== "all";

  return (
    <>
      {/* Compact Filter Bar */}
      <View className="bg-neutral-800 border-b border-neutral-700">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        >
          {/* Sort Button */}
          <Pressable
            onPress={() => {
              setActiveTab("sort");
              setShowModal(true);
            }}
            className={`mr-3 px-4 py-2 rounded-full flex-row items-center ${
              selectedSort !== "forYou" ? "bg-blue-500" : "bg-neutral-700"
            }`}
          >
            <Text className="mr-1.5">{currentSort?.icon}</Text>
            <Text
              className={`font-semibold text-sm ${
                selectedSort !== "forYou" ? "text-white" : "text-neutral-300"
              }`}
            >
              {currentSort?.label}
            </Text>
          </Pressable>

          {/* Channel Button */}
          <Pressable
            onPress={() => {
              setActiveTab("channel");
              setShowModal(true);
            }}
            className={`mr-3 px-4 py-2 rounded-full flex-row items-center ${
              selectedChannelId ? "bg-blue-500" : "bg-neutral-700"
            }`}
          >
            <Text className="mr-1.5">{currentChannel?.icon}</Text>
            <Text
              className={`font-semibold text-sm ${
                selectedChannelId ? "text-white" : "text-neutral-300"
              }`}
            >
              {currentChannel?.name}
            </Text>
          </Pressable>

          {/* Duration Button */}
          <Pressable
            onPress={() => {
              setActiveTab("duration");
              setShowModal(true);
            }}
            className={`mr-3 px-4 py-2 rounded-full flex-row items-center ${
              selectedDuration !== "all" ? "bg-blue-500" : "bg-neutral-700"
            }`}
          >
            <Text className="mr-1.5">{currentDuration?.icon}</Text>
            <Text
              className={`font-semibold text-sm ${
                selectedDuration !== "all" ? "text-white" : "text-neutral-300"
              }`}
            >
              {currentDuration?.label}
            </Text>
          </Pressable>

          {/* Clear Filters Button (only show if filters are active) */}
          {hasActiveFilters && (
            <Pressable
              onPress={() => {
                onSortChange("forYou");
                onChannelChange(null);
                onDurationChange("all");
              }}
              className="px-4 py-2 rounded-full flex-row items-center bg-neutral-700 border border-neutral-600"
            >
              <Text className="font-semibold text-sm text-neutral-300">
                ✕ Clear
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50"
          onPress={() => setShowModal(false)}
        >
          <Pressable
            className="absolute bottom-0 left-0 right-0 bg-neutral-800 rounded-t-3xl"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-neutral-700">
              <Text className="text-white text-lg font-bold">Filters</Text>
              <Pressable onPress={() => setShowModal(false)}>
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
            <ScrollView className="max-h-96">
              {activeTab === "sort" && (
                <View className="p-4">
                  {sortFilters.map((filter) => {
                    const isSelected = selectedSort === filter.value;
                    return (
                      <Pressable
                        key={filter.value}
                        onPress={() => {
                          onSortChange(filter.value);
                          setShowModal(false);
                        }}
                        className={`flex-row items-center p-4 rounded-lg mb-2 ${
                          isSelected ? "bg-blue-500" : "bg-neutral-700"
                        }`}
                      >
                        <Text className="mr-3 text-xl">{filter.icon}</Text>
                        <Text
                          className={`flex-1 font-semibold ${
                            isSelected ? "text-white" : "text-neutral-300"
                          }`}
                        >
                          {filter.label}
                        </Text>
                        {isSelected && <Text className="text-white">✓</Text>}
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
                          setShowModal(false);
                        }}
                        disabled={channelsLoading}
                        className={`flex-row items-center p-4 rounded-lg mb-2 ${
                          isSelected ? "bg-blue-500" : "bg-neutral-700"
                        }`}
                      >
                        <Text className="mr-3 text-xl">{option.icon}</Text>
                        <Text
                          className={`flex-1 font-semibold ${
                            isSelected ? "text-white" : "text-neutral-300"
                          }`}
                        >
                          {option.name}
                        </Text>
                        {isSelected && <Text className="text-white">✓</Text>}
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
                          setShowModal(false);
                        }}
                        className={`flex-row items-center p-4 rounded-lg mb-2 ${
                          isSelected ? "bg-blue-500" : "bg-neutral-700"
                        }`}
                      >
                        <Text className="mr-3 text-xl">{filter.icon}</Text>
                        <Text
                          className={`flex-1 font-semibold ${
                            isSelected ? "text-white" : "text-neutral-300"
                          }`}
                        >
                          {filter.label}
                        </Text>
                        {isSelected && <Text className="text-white">✓</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export default UnifiedFilterBar;
