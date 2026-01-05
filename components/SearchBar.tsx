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
    <View className="mb-4 flex-row items-center rounded-lg bg-white px-4 py-3 shadow-sm">
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        className="flex-1 text-base text-gray-900"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search naats"
        accessibilityHint="Type to search for naats by title"
      />
      {value.length > 0 && (
        <Pressable
          onPress={handleClear}
          className="ml-2 rounded-full bg-gray-200 px-3 py-1 active:bg-gray-300"
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Text className="text-sm font-semibold text-gray-700">Clear</Text>
        </Pressable>
      )}
    </View>
  );
};

export default SearchBar;
