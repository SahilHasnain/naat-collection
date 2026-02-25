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
    <View
      className="flex-row items-center rounded-full px-4 py-2.5"
      style={{
        backgroundColor: colors.background.secondary,
        borderColor: colors.border.secondary,
        borderWidth: 1,
      }}
    >
      {/* Search icon */}
      <Ionicons
        name="search"
        size={20}
        color={colors.text.secondary}
        style={{ marginRight: 12 }}
      />

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.secondary}
        className="flex-1 text-base text-white"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search naats"
        accessibilityHint="Type to search for naats by title"
        style={{ paddingVertical: 0 }}
      />

      {value.length > 0 && (
        <Pressable
          onPress={handleClear}
          className="ml-2"
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
  );
};

export default SearchBar;
