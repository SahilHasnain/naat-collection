import { colors } from "@/constants/theme";
import type { Channel, DurationOption, SortOption } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(500);

  // Animate in/out based on visible prop
  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 250 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(500, { duration: 200 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

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
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" },
          backdropStyle,
        ]}
      >
        <Pressable className="flex-1" onPress={onClose}>
          <SafeAreaView
            edges={["bottom"]}
            className="absolute bottom-0 left-0 right-0"
          >
            <Animated.View style={modalStyle}>
              <Pressable
                className="bg-neutral-800 rounded-t-3xl"
                onPress={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <View className="flex-row items-center justify-between px-6 py-5">
                  <Text
                    className="text-xl font-bold"
                    style={{ color: colors.text.primary }}
                  >
                    Filters
                  </Text>
                  <Pressable
                    onPress={onClose}
                    style={{
                      minHeight: 44,
                      minWidth: 44,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="close" size={24} color="#aaaaaa" />
                  </Pressable>
                </View>

                {/* Tabs */}
                <View className="flex-row px-6 mb-2">
                  <Pressable
                    onPress={() => setActiveTab("sort")}
                    className={`flex-1 py-3 rounded-full mr-2 ${
                      activeTab === "sort" ? "bg-blue-500" : "bg-neutral-700"
                    }`}
                    style={{ minHeight: 44 }}
                  >
                    <Text
                      className={`text-center font-semibold text-sm`}
                      style={{
                        color:
                          activeTab === "sort"
                            ? colors.text.primary
                            : "#a3a3a3",
                      }}
                    >
                      Sort
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setActiveTab("channel")}
                    className={`flex-1 py-3 rounded-full mr-2 ${
                      activeTab === "channel" ? "bg-blue-500" : "bg-neutral-700"
                    }`}
                    style={{ minHeight: 44 }}
                  >
                    <Text
                      className={`text-center font-semibold text-sm`}
                      style={{
                        color:
                          activeTab === "channel"
                            ? colors.text.primary
                            : "#a3a3a3",
                      }}
                    >
                      Channel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setActiveTab("duration")}
                    className={`flex-1 py-3 rounded-full ${
                      activeTab === "duration"
                        ? "bg-blue-500"
                        : "bg-neutral-700"
                    }`}
                    style={{ minHeight: 44 }}
                  >
                    <Text
                      className={`text-center font-semibold text-sm`}
                      style={{
                        color:
                          activeTab === "duration"
                            ? colors.text.primary
                            : "#a3a3a3",
                      }}
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
                            className={`flex-row items-center p-4 rounded-xl mb-2 ${
                              isSelected ? "bg-blue-500" : "bg-neutral-700"
                            }`}
                            style={{ minHeight: 56 }}
                          >
                            <Ionicons
                              name={filter.iconName}
                              size={22}
                              color={colors.text.primary}
                            />
                            <Text
                              className={`flex-1 font-semibold text-base ml-3`}
                              style={{
                                color: isSelected
                                  ? colors.text.primary
                                  : "#d4d4d4",
                              }}
                            >
                              {filter.label}
                            </Text>
                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color={colors.text.primary}
                              />
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
                            className={`flex-row items-center p-4 rounded-xl mb-2 ${
                              isSelected ? "bg-blue-500" : "bg-neutral-700"
                            }`}
                            style={{ minHeight: 56 }}
                          >
                            <Ionicons
                              name={option.iconName}
                              size={22}
                              color={colors.text.primary}
                            />
                            <Text
                              className={`flex-1 font-semibold text-base ml-3`}
                              style={{
                                color: isSelected
                                  ? colors.text.primary
                                  : "#d4d4d4",
                              }}
                            >
                              {option.name}
                            </Text>
                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color={colors.text.primary}
                              />
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
                            className={`flex-row items-center p-4 rounded-xl mb-2 ${
                              isSelected ? "bg-blue-500" : "bg-neutral-700"
                            }`}
                            style={{ minHeight: 56 }}
                          >
                            <Ionicons
                              name={filter.iconName}
                              size={22}
                              color={colors.text.primary}
                            />
                            <Text
                              className={`flex-1 font-semibold text-base ml-3`}
                              style={{
                                color: isSelected
                                  ? colors.text.primary
                                  : "#d4d4d4",
                              }}
                            >
                              {filter.label}
                            </Text>
                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color={colors.text.primary}
                              />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>
              </Pressable>
            </Animated.View>
          </SafeAreaView>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
