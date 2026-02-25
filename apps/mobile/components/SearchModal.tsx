import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
}

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
              <Ionicons name="arrow-back" size={24} color="white" />
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
                className="flex-1 text-white text-base"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={{ paddingVertical: 0 }}
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
                <Ionicons name="mic" size={24} color="white" />
              </Pressable>
            )}
          </View>

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
