import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { FlatList, Keyboard, Pressable, Text, View } from "react-native";

export interface SearchSuggestion {
  id: string;
  text: string;
  thumbnailUrl?: string;
  isNew?: boolean;
  type?: "history" | "suggestion";
}

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  onSuggestionPress: (suggestion: SearchSuggestion) => void;
  onSuggestionInsert?: (suggestion: SearchSuggestion) => void;
  onClearHistory?: () => void;
}

export function SearchSuggestions({
  suggestions,
  onSuggestionPress,
  onSuggestionInsert,
  onClearHistory,
}: SearchSuggestionsProps) {
  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => {
    const isHistory = item.type === "history";

    return (
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          onSuggestionPress(item);
        }}
        className="flex-row items-center px-4 py-3"
        style={{ backgroundColor: colors.background.primary }}
        android_ripple={{ color: colors.background.tertiary }}
      >
        {/* Left Icon */}
        <View className="mr-4">
          <Ionicons
            name={isHistory ? "time-outline" : "search"}
            size={24}
            color={colors.text.secondary}
          />
        </View>

        {/* Text Content */}
        <View className="flex-1 mr-3">
          <Text
            className="text-base"
            style={{ color: colors.text.primary }}
            numberOfLines={2}
          >
            {item.text}
          </Text>
          {item.isNew && (
            <View className="flex-row items-center mt-1">
              <View
                className="w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: "#3ea6ff" }}
              />
              <Text className="text-xs" style={{ color: "#3ea6ff" }}>
                New video
              </Text>
            </View>
          )}
        </View>

        {/* Thumbnail (if available) */}
        {item.thumbnailUrl && (
          <View className="mr-3">
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={{
                width: 56,
                height: 32,
                borderRadius: 4,
              }}
              contentFit="cover"
            />
          </View>
        )}

        {/* Right Action Icon */}
        {onSuggestionInsert && (
          <Pressable
            onPress={() => onSuggestionInsert(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Insert suggestion"
            accessibilityRole="button"
          >
            <Ionicons
              name="arrow-up-outline"
              size={20}
              color={colors.text.secondary}
              style={{ transform: [{ rotate: "45deg" }] }}
            />
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.background.primary }}
    >
      <FlatList
        data={suggestions}
        renderItem={renderSuggestion}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View
            className="mx-4"
            style={{
              height: 1,
              backgroundColor: colors.border.secondary,
              opacity: 0.3,
            }}
          />
        )}
      />
    </View>
  );
}
