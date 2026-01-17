import { colors } from "@/constants/theme";
import { SearchBarProps } from "@/types";
import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "Search naats...",
}) => {
  const inputRef = React.useRef<TextInput>(null);

  const handleClear = () => {
    onChangeText("");
    inputRef.current?.focus();
  };

  return (
    <View className="flex-row items-center rounded-lg bg-neutral-700 px-3 py-2 border border-neutral-600">
      {/* Search icon */}
      <Text className="mr-2 text-base text-neutral-500">🔍</Text>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.secondary}
        className="flex-1 text-sm text-white"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search naats"
        accessibilityHint="Type to search for naats by title"
      />

      {value.length > 0 && (
        <Pressable
          onPress={handleClear}
          className="ml-2 rounded-full bg-neutral-600 px-2 py-1 active:bg-neutral-500"
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Text className="text-xs font-bold text-neutral-200">✕</Text>
        </Pressable>
      )}
    </View>
  );
};

export default SearchBar;
