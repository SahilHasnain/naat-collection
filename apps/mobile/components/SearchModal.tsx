import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { Channel, DurationOption } from "@naat-collection/shared";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Pressable from "./ResponsivePressable";
import { SearchSuggestion, SearchSuggestions } from "./SearchSuggestions";

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  query: string;
  onChangeQuery: (query: string) => void;
  onSubmitSearch?: (query: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
  suggestions?: SearchSuggestion[];
  onSuggestionPress?: (suggestion: SearchSuggestion) => void;
  onSuggestionInsert?: (suggestion: SearchSuggestion) => void;
  showVoiceSearch?: boolean;
  // Search-specific filters
  channels?: Channel[];
  selectedChannelId?: string | null;
  onChannelChange?: (channelId: string | null) => void;
  selectedDuration?: DurationOption;
  onDurationChange?: (duration: DurationOption) => void;
}

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

export function SearchModal({
  visible,
  onClose,
  query,
  onChangeQuery,
  onSubmitSearch,
  placeholder = "Search...",
  children,
  suggestions = [],
  onSuggestionPress,
  onSuggestionInsert,
  showVoiceSearch = false,
  channels = [],
  selectedChannelId = null,
  onChannelChange,
  selectedDuration = "all",
  onDurationChange,
}: SearchModalProps) {
  const inputRef = useRef<TextInput>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const handleClose = () => {
    onChangeQuery("");
    onClose();
  };

  const handleSubmit = () => {
    if (query.trim() && onSubmitSearch) {
      onSubmitSearch(query.trim());
    }
  };

  // Show suggestions when we have them (either history or search suggestions)
  const showSuggestions = suggestions.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: colors.background.primary }}
        edges={["top"]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(0, 0, 0, 0.44)",
            "rgba(6, 10, 20, 0.22)",
            "rgba(0, 0, 0, 0.08)",
            "rgba(0, 0, 0, 0.28)",
          ]}
          locations={[0, 0.2, 0.58, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Search Header */}
          <View
            className="flex-row items-center px-4 py-3"
            style={{ backgroundColor: colors.background.primary }}
          >
            {/* Back Button */}
            <Pressable
              onPress={handleClose}
              className="mr-3"
              accessibilityLabel="Close search"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={colors.text.primary}
              />
            </Pressable>

            {/* Search Input */}
            <View
              className="flex-1 flex-row items-center px-4 py-2.5 rounded-full"
              style={{ backgroundColor: colors.background.secondary }}
            >
              <Ionicons
                name="search"
                size={20}
                color={colors.text.secondary}
                style={{ marginRight: 12 }}
              />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={onChangeQuery}
                onSubmitEditing={handleSubmit}
                placeholder={placeholder}
                placeholderTextColor={colors.text.secondary}
                className="flex-1 text-base"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={{ paddingVertical: 0, color: colors.text.primary }}
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => onChangeQuery("")}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.text.secondary}
                  />
                </Pressable>
              )}
            </View>

            {/* Voice Search Button (optional) */}
            {showVoiceSearch && (
              <Pressable
                className="ml-3"
                accessibilityLabel="Voice search"
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="mic" size={24} color={colors.text.primary} />
              </Pressable>
            )}
          </View>

          {/* Search Filter Bar */}
          {onChannelChange && onDurationChange && (
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
                    color={
                      selectedChannelId === null
                        ? colors.text.primary
                        : "#d4d4d8"
                    }
                  />
                  <Text
                    className={`font-medium text-xs ml-1.5`}
                    style={{
                      color:
                        selectedChannelId === null
                          ? colors.text.primary
                          : "#d4d4d8",
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
          )}

          {/* Content: Suggestions or Search Results */}
          <View className="flex-1">
            {showSuggestions ? (
              <SearchSuggestions
                suggestions={suggestions}
                onSuggestionPress={(suggestion) => {
                  onSuggestionPress?.(suggestion);
                }}
                onSuggestionInsert={(suggestion) => {
                  onSuggestionInsert?.(suggestion);
                }}
              />
            ) : (
              children
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
