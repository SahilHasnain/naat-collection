import { colors } from "@/constants/theme";
import { SearchBarProps } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, TextInput, View } from "react-native";

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
      <Ionicons
        name="search"
        size={18}
        color="#737373"
        style={{ marginRight: 8 }}
      />

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
          className="ml-2 rounded-full bg-neutral-600 p-2 active:bg-neutral-500"
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#e5e5e5" />
        </Pressable>
      )}
    </View>
  );
};

export default SearchBar;
