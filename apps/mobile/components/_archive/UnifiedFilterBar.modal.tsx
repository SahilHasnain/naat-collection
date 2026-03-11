import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type {
  Channel,
  DurationOption,
  SortOption,
} from "@naat-collection/shared";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  // Pure (cut audio only)
  pureOnly?: boolean;
  onPureOnlyChange?: (value: boolean) => void;
  // External modal control (from header filter button)
  externalOpen?: boolean;
  onExternalClose?: () => void;
  // Hide the chip bar (modal still available)
  hideChips?: boolean;
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
  pureOnly = false,
  onPureOnlyChange,
  externalOpen = false,
  onExternalClose,
  hideChips = false,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"sort" | "channel" | "duration">(
    "sort",
  );

  // Open modal when header filter button is pressed
  React.useEffect(() => {
    if (externalOpen) {
      setShowModal(true);
    }
  }, [externalOpen]);

  // Notify parent when modal closes
  const handleCloseModal = () => {
    setShowModal(false);
    onExternalClose?.();
  };

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

  // Check if "Other" is selected (when selectedChannelId matches any other channel)
  const isOtherSelected =
    selectedChannelId !== null &&
    otherChannels.some((ch) => ch.id === selectedChannelId);

  // Get current selections for display
  const currentSort = sortFilters.find((f) => f.value === selectedSort);

  // Determine current channel display
  let currentChannel: {
    id: string | null;
    name: string;
    iconName: keyof typeof Ionicons.glyphMap;
  };
  if (isOtherSelected) {
    currentChannel = {
      id: "other",
      name: "Other",
      iconName: "folder",
    };
  } else {
    currentChannel =
      channelOptions.find((c) => c.id === selectedChannelId) ||
      channelOptions[0];
  }

  const currentDuration = durationFilters.find(
    (f) => f.value === selectedDuration,
  );

  // Check if any non-default filters are active
  const hasActiveFilters =
    selectedSort !== "forYou" ||
    selectedChannelId !== null ||
    selectedDuration !== "all" ||
    pureOnly;

  return (
    <>
      {/* Compact Filter Bar */}
      {!hideChips && (
      <View
        className="pt-0"
        style={{
          backgroundColor: colors.background.primary,
        }}
      >
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
            className="mr-3 px-4 py-2.5 rounded-full flex-row items-center"
            style={{
              backgroundColor:
                selectedSort !== "forYou"
                  ? colors.accent.secondary
                  : colors.background.tertiary,
              minHeight: 44,
            }}
          >
            <Ionicons
              name={currentSort?.iconName || "sparkles"}
              size={16}
              color={
                selectedSort !== "forYou" ? colors.text.primary : "#d4d4d8"
              }
            />
            <Text
              className={`font-semibold text-sm ml-2`}
              style={{
                color:
                  selectedSort !== "forYou" ? colors.text.primary : "#d4d4d8",
              }}
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
            className="mr-3 px-4 py-2.5 rounded-full flex-row items-center"
            style={{
              backgroundColor: selectedChannelId
                ? colors.accent.secondary
                : colors.background.tertiary,
              minHeight: 44,
            }}
          >
            <Ionicons
              name={currentChannel?.iconName || "globe"}
              size={16}
              color={selectedChannelId ? colors.text.primary : "#d4d4d8"}
            />
            <Text
              className={`font-semibold text-sm ml-2`}
              style={{
                color: selectedChannelId ? colors.text.primary : "#d4d4d8",
              }}
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
            className="mr-3 px-4 py-2.5 rounded-full flex-row items-center"
            style={{
              backgroundColor:
                selectedDuration !== "all"
                  ? colors.accent.secondary
                  : colors.background.tertiary,
              minHeight: 44,
            }}
          >
            <Ionicons
              name={currentDuration?.iconName || "infinite"}
              size={16}
              color={
                selectedDuration !== "all" ? colors.text.primary : "#d4d4d8"
              }
            />
            <Text
              className={`font-semibold text-sm ml-2`}
              style={{
                color:
                  selectedDuration !== "all" ? colors.text.primary : "#d4d4d8",
              }}
            >
              {currentDuration?.label}
            </Text>
          </Pressable>

          {/* Pure Toggle */}
          <Pressable
            onPress={() => onPureOnlyChange?.(!pureOnly)}
            className="mr-3 px-4 py-2.5 rounded-full flex-row items-center"
            style={{
              backgroundColor: pureOnly
                ? colors.accent.primary
                : colors.background.tertiary,
              minHeight: 44,
            }}
          >
            <Ionicons
              name="cut-outline"
              size={16}
              color={pureOnly ? "#fff" : "#d4d4d8"}
            />
            <Text
              className="font-semibold text-sm ml-2"
              style={{
                color: pureOnly ? "#fff" : "#d4d4d8",
              }}
            >
              Pure
            </Text>
          </Pressable>

          {/* Clear Filters Button (only show if filters are active) */}
          {hasActiveFilters && (
            <Pressable
              onPress={() => {
                onSortChange("forYou");
                onChannelChange(null);
                onDurationChange("all");
                onPureOnlyChange?.(false);
              }}
              className="px-4 py-2.5 rounded-full flex-row items-center"
              style={{
                backgroundColor: colors.background.secondary,
                minHeight: 44,
              }}
            >
              <Ionicons name="close-circle" size={16} color="#d4d4d8" />
              <Text className="font-semibold text-sm text-neutral-300 ml-2">
                Clear
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => handleCloseModal()}
      >
        <Pressable
          className="flex-1"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onPress={() => handleCloseModal()}
        >
          <SafeAreaView
            edges={["bottom"]}
            className="absolute bottom-0 left-0 right-0"
          >
            <Pressable
              className="rounded-t-3xl"
              style={{ backgroundColor: colors.background.secondary }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <View
                className="flex-row items-center justify-between px-6 py-4 border-b"
                style={{ borderBottomColor: colors.border.secondary }}
              >
                <Text
                  className="text-xl font-bold"
                  style={{ color: colors.text.primary }}
                >
                  Filters
                </Text>

                <View className="flex-row items-center">
                  {/* Pure toggle in header */}
                  <Pressable
                    onPress={() => onPureOnlyChange?.(!pureOnly)}
                    className="flex-row items-center mr-4"
                    style={{ minHeight: 44 }}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: pureOnly }}
                    accessibilityLabel="Pure only filter"
                  >
                    <Ionicons
                      name="cut-outline"
                      size={16}
                      color={pureOnly ? colors.accent.primary : colors.text.tertiary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: pureOnly ? colors.accent.primary : colors.text.tertiary,
                        marginRight: 8,
                      }}
                    >
                      Pure
                    </Text>
                    <View
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: pureOnly ? colors.accent.primary : colors.background.elevated,
                        justifyContent: "center",
                        paddingHorizontal: 2,
                      }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: "#fff",
                          alignSelf: pureOnly ? "flex-end" : "flex-start",
                        }}
                      />
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => handleCloseModal()}
                    style={{
                      minHeight: 44,
                      minWidth: 44,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={colors.text.secondary}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Tabs */}
              <View
                className="flex-row border-b"
                style={{ borderBottomColor: colors.border.secondary }}
              >
                <Pressable
                  onPress={() => setActiveTab("sort")}
                  className={`flex-1 py-4 ${
                    activeTab === "sort" ? "border-b-2 border-blue-500" : ""
                  }`}
                  style={{ minHeight: 44 }}
                >
                  <Text
                    className={`text-center font-semibold text-base ${
                      activeTab === "sort"
                        ? "text-blue-500"
                        : "text-neutral-400"
                    }`}
                  >
                    Sort
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab("channel")}
                  className={`flex-1 py-4 ${
                    activeTab === "channel" ? "border-b-2 border-blue-500" : ""
                  }`}
                  style={{ minHeight: 44 }}
                >
                  <Text
                    className={`text-center font-semibold text-base ${
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
                  className={`flex-1 py-4 ${
                    activeTab === "duration" ? "border-b-2 border-blue-500" : ""
                  }`}
                  style={{ minHeight: 44 }}
                >
                  <Text
                    className={`text-center font-semibold text-base ${
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
                            handleCloseModal();
                          }}
                          className="flex-row items-center p-4 rounded-xl mb-2"
                          style={{
                            backgroundColor: isSelected
                              ? colors.accent.secondary
                              : colors.background.tertiary,
                            minHeight: 56,
                          }}
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
                            handleCloseModal();
                          }}
                          disabled={channelsLoading}
                          className="flex-row items-center p-4 rounded-xl mb-2"
                          style={{
                            backgroundColor: isSelected
                              ? colors.accent.secondary
                              : colors.background.tertiary,
                            minHeight: 56,
                          }}
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
                            handleCloseModal();
                          }}
                          className="flex-row items-center p-4 rounded-xl mb-2"
                          style={{
                            backgroundColor: isSelected
                              ? colors.accent.secondary
                              : colors.background.tertiary,
                            minHeight: 56,
                          }}
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
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
};

export default UnifiedFilterBar;
