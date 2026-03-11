import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type {
  Channel,
  DurationOption,
  SortOption,
} from "@naat-collection/shared";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

interface UnifiedFilterBarProps {
  selectedSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  channels: Channel[];
  selectedChannelId: string | null;
  onChannelChange: (channelId: string | null) => void;
  channelsLoading?: boolean;
  selectedDuration: DurationOption;
  onDurationChange: (duration: DurationOption) => void;
  pureOnly?: boolean;
  onPureOnlyChange?: (value: boolean) => void;
  externalOpen?: boolean;
  onExternalClose?: () => void;
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
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [activeTab, setActiveTab] = useState<"sort" | "channel" | "duration">("sort");
  const snapPoints = useMemo(() => ["55%"], []);

  // Open sheet when external trigger fires
  React.useEffect(() => {
    if (externalOpen) {
      bottomSheetRef.current?.present();
    }
  }, [externalOpen]);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    onExternalClose?.();
  }, [onExternalClose]);

  const handleDismiss = useCallback(() => {
    onExternalClose?.();
  }, [onExternalClose]);

  const openSheet = useCallback(
    (tab: "sort" | "channel" | "duration") => {
      setActiveTab(tab);
      bottomSheetRef.current?.present();
    },
    [],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  // --- Filter data ---

  const sortFilters: { value: SortOption; label: string; iconName: keyof typeof Ionicons.glyphMap }[] = [
    { value: "forYou", label: "For You", iconName: "sparkles" },
    { value: "latest", label: "Latest", iconName: "time" },
    { value: "popular", label: "Popular", iconName: "flame" },
    { value: "oldest", label: "Oldest", iconName: "calendar" },
  ];

  const durationFilters: { value: DurationOption; label: string; iconName: keyof typeof Ionicons.glyphMap }[] = [
    { value: "all", label: "All", iconName: "infinite" },
    { value: "short", label: "< 5 min", iconName: "flash" },
    { value: "medium", label: "5-15 min", iconName: "hourglass" },
    { value: "long", label: "> 15 min", iconName: "film" },
  ];

  const mainChannels = channels.filter((ch) => !ch.isOther);
  const otherChannels = channels.filter((ch) => ch.isOther);
  const sortedMainChannels = [...mainChannels].sort((a, b) => a.name.localeCompare(b.name));

  const channelOptions: { id: string | null; name: string; iconName: keyof typeof Ionicons.glyphMap; type: "all" | "channel" | "other" }[] = [
    { id: null, name: "All", iconName: "globe", type: "all" },
    ...sortedMainChannels.map((ch) => ({ id: ch.id, name: ch.name, iconName: "tv" as keyof typeof Ionicons.glyphMap, type: "channel" as const })),
  ];
  if (otherChannels.length > 0) {
    channelOptions.push({ id: "other", name: "Other", iconName: "folder", type: "other" });
  }

  const isOtherSelected = selectedChannelId !== null && otherChannels.some((ch) => ch.id === selectedChannelId);
  const currentSort = sortFilters.find((f) => f.value === selectedSort);
  let currentChannel: { id: string | null; name: string; iconName: keyof typeof Ionicons.glyphMap };
  if (isOtherSelected) {
    currentChannel = { id: "other", name: "Other", iconName: "folder" };
  } else {
    currentChannel = channelOptions.find((c) => c.id === selectedChannelId) || channelOptions[0];
  }
  const currentDuration = durationFilters.find((f) => f.value === selectedDuration);
  const hasActiveFilters = selectedSort !== "forYou" || selectedChannelId !== null || selectedDuration !== "all" || pureOnly;

  return (
    <>
      {/* Compact Filter Chips */}
      {!hideChips && (
        <View style={{ backgroundColor: colors.background.primary }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          >
            {/* Sort Chip */}
            <Pressable
              onPress={() => openSheet("sort")}
              className="mr-3 px-4 py-2.5 rounded-full flex-row items-center"
              style={{ backgroundColor: selectedSort !== "forYou" ? colors.accent.secondary : colors.background.tertiary, minHeight: 44 }}
            >
              <Ionicons name={currentSort?.iconName || "sparkles"} size={16} color={selectedSort !== "forYou" ? colors.text.primary : "#d4d4d8"} />
              <Text className="font-semibold text-sm ml-2" style={{ color: selectedSort !== "forYou" ? colors.text.primary : "#d4d4d8" }}>{currentSort?.label}</Text>
            </Pressable>

            {/* Channel Chip */}
            <Pressable
              onPress={() => openSheet("channel")}
              className="mr-3 px-4 py-2.5 rounded-full flex-row items-center"
              style={{ backgroundColor: selectedChannelId ? colors.accent.secondary : colors.background.tertiary, minHeight: 44 }}
            >
              <Ionicons name={currentChannel?.iconName || "globe"} size={16} color={selectedChannelId ? colors.text.primary : "#d4d4d8"} />
              <Text className="font-semibold text-sm ml-2" style={{ color: selectedChannelId ? colors.text.primary : "#d4d4d8" }}>{currentChannel?.name}</Text>
            </Pressable>

            {/* Duration Chip */}
            <Pressable
              onPress={() => openSheet("duration")}
              className="mr-3 px-4 py-2.5 rounded-full flex-row items-center"
              style={{ backgroundColor: selectedDuration !== "all" ? colors.accent.secondary : colors.background.tertiary, minHeight: 44 }}
            >
              <Ionicons name={currentDuration?.iconName || "infinite"} size={16} color={selectedDuration !== "all" ? colors.text.primary : "#d4d4d8"} />
              <Text className="font-semibold text-sm ml-2" style={{ color: selectedDuration !== "all" ? colors.text.primary : "#d4d4d8" }}>{currentDuration?.label}</Text>
            </Pressable>

            {/* Pure Chip */}
            <Pressable
              onPress={() => onPureOnlyChange?.(!pureOnly)}
              className="mr-3 px-4 py-2.5 rounded-full flex-row items-center"
              style={{ backgroundColor: pureOnly ? colors.accent.primary : colors.background.tertiary, minHeight: 44 }}
            >
              <Ionicons name="cut-outline" size={16} color={pureOnly ? "#fff" : "#d4d4d8"} />
              <Text className="font-semibold text-sm ml-2" style={{ color: pureOnly ? "#fff" : "#d4d4d8" }}>Pure</Text>
            </Pressable>

            {/* Clear */}
            {hasActiveFilters && (
              <Pressable
                onPress={() => { onSortChange("forYou"); onChannelChange(null); onDurationChange("all"); onPureOnlyChange?.(false); }}
                className="px-4 py-2.5 rounded-full flex-row items-center"
                style={{ backgroundColor: colors.background.secondary, minHeight: 44 }}
              >
                <Ionicons name="close-circle" size={16} color="#d4d4d8" />
                <Text className="font-semibold text-sm text-neutral-300 ml-2">Clear</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}

      {/* Bottom Sheet Modal — renders via portal, works regardless of nesting */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        onDismiss={handleDismiss}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.text.tertiary }}
        backgroundStyle={{ backgroundColor: colors.background.secondary }}
      >
        {/* Sheet Header */}
        <View
          className="flex-row items-center justify-between px-6 py-3 border-b"
          style={{ borderBottomColor: colors.border.secondary }}
        >
          <Text className="text-xl font-bold" style={{ color: colors.text.primary }}>Filters</Text>
          <View className="flex-row items-center">
            <Pressable
              onPress={() => onPureOnlyChange?.(!pureOnly)}
              className="flex-row items-center mr-4"
              style={{ minHeight: 44 }}
              accessibilityRole="switch"
              accessibilityState={{ checked: pureOnly }}
              accessibilityLabel="Pure only filter"
            >
              <Ionicons name="cut-outline" size={16} color={pureOnly ? colors.accent.primary : colors.text.tertiary} style={{ marginRight: 6 }} />
              <Text className="text-sm font-semibold" style={{ color: pureOnly ? colors.accent.primary : colors.text.tertiary, marginRight: 8 }}>Pure</Text>
              <View style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: pureOnly ? colors.accent.primary : colors.background.elevated, justifyContent: "center", paddingHorizontal: 2 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff", alignSelf: pureOnly ? "flex-end" : "flex-start" }} />
              </View>
            </Pressable>
            <Pressable onPress={handleClose} style={{ minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" }}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </Pressable>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b" style={{ borderBottomColor: colors.border.secondary }}>
          {(["sort", "channel", "duration"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-4 ${activeTab === tab ? "border-b-2 border-blue-500" : ""}`}
              style={{ minHeight: 44 }}
            >
              <Text className={`text-center font-semibold text-base ${activeTab === tab ? "text-blue-500" : "text-neutral-400"}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Content */}
        <BottomSheetScrollView>
          {activeTab === "sort" && (
            <View className="p-4">
              {sortFilters.map((filter) => {
                const isSelected = selectedSort === filter.value;
                return (
                  <Pressable
                    key={filter.value}
                    onPress={() => { onSortChange(filter.value); handleClose(); }}
                    className="flex-row items-center p-4 rounded-xl mb-2"
                    style={{ backgroundColor: isSelected ? colors.accent.secondary : colors.background.tertiary, minHeight: 56 }}
                  >
                    <Ionicons name={filter.iconName} size={22} color={colors.text.primary} />
                    <Text className="flex-1 font-semibold text-base ml-3" style={{ color: isSelected ? colors.text.primary : "#d4d4d4" }}>{filter.label}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.text.primary} />}
                  </Pressable>
                );
              })}
            </View>
          )}

          {activeTab === "channel" && (
            <View className="p-4">
              {channelOptions.map((option) => {
                const isSelected = option.type === "other" ? isOtherSelected : selectedChannelId === option.id;
                return (
                  <Pressable
                    key={option.id || "all"}
                    onPress={() => {
                      if (option.type === "other" && otherChannels.length > 0) { onChannelChange(otherChannels[0].id); }
                      else { onChannelChange(option.id); }
                      handleClose();
                    }}
                    disabled={channelsLoading}
                    className="flex-row items-center p-4 rounded-xl mb-2"
                    style={{ backgroundColor: isSelected ? colors.accent.secondary : colors.background.tertiary, minHeight: 56 }}
                  >
                    <Ionicons name={option.iconName} size={22} color={colors.text.primary} />
                    <Text className="flex-1 font-semibold text-base ml-3" style={{ color: isSelected ? colors.text.primary : "#d4d4d4" }}>{option.name}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.text.primary} />}
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
                    onPress={() => { onDurationChange(filter.value); handleClose(); }}
                    className="flex-row items-center p-4 rounded-xl mb-2"
                    style={{ backgroundColor: isSelected ? colors.accent.secondary : colors.background.tertiary, minHeight: 56 }}
                  >
                    <Ionicons name={filter.iconName} size={22} color={colors.text.primary} />
                    <Text className="flex-1 font-semibold text-base ml-3" style={{ color: isSelected ? colors.text.primary : "#d4d4d4" }}>{filter.label}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.text.primary} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
};

export default UnifiedFilterBar;
