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

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  query: string;
  onChangeQuery: (query: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function SearchModal({
  visible,
  onClose,
  query,
  onChangeQuery,
  placeholder = "Search...",
  children,
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
            className="flex-row items-center px-4 py-3 border-b"
            style={{ borderBottomColor: colors.border.secondary }}
          >
            {/* Back Button */}
            <Pressable
              onPress={handleClose}
              className="mr-3"
              accessibilityLabel="Close search"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>

            {/* Search Input */}
            <View
              className="flex-1 flex-row items-center px-4 py-2 rounded-full"
              style={{ backgroundColor: colors.background.tertiary }}
            >
              <Ionicons
                name="search"
                size={20}
                color={colors.text.secondary}
                style={{ marginRight: 8 }}
              />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={onChangeQuery}
                placeholder={placeholder}
                placeholderTextColor={colors.text.secondary}
                className="flex-1 text-white text-base"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => onChangeQuery("")}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.text.secondary}
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* Search Results */}
          <View className="flex-1">{children}</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
