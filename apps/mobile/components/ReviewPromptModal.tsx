import { colors } from "@/constants/theme";
import Pressable from "@/components/ResponsivePressable";
import { PLAY_STORE_URL } from "@/services/reviewPrompt";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Linking, Modal, Text, View } from "react-native";

interface ReviewPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onRate: () => void;
  onSnooze: () => void;
  onNever: () => void;
}

export default function ReviewPromptModal({
  visible,
  onClose,
  onRate,
  onSnooze,
  onNever,
}: ReviewPromptModalProps) {
  const handleRate = () => {
    Linking.openURL(PLAY_STORE_URL).catch(() => {});
    onRate();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSnooze}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: colors.background.secondary,
            borderWidth: 1,
            borderColor: colors.border.secondary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35,
            shadowRadius: 24,
            elevation: 16,
          }}
        >
          <LinearGradient
            colors={[
              "rgba(36, 36, 36, 0.98)",
              "rgba(24, 24, 24, 0.98)",
              "rgba(18, 18, 18, 0.98)",
            ]}
            locations={[0, 0.45, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ padding: 24, alignItems: "center" }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.accent.primary + "22",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="star" size={36} color={colors.accent.primary} />
            </View>

            <Text
              style={{
                color: colors.text.primary,
                fontSize: 20,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Enjoying the app?
            </Text>
            <Text
              style={{
                color: colors.text.secondary,
                fontSize: 14,
                lineHeight: 20,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
            If you&apos;re enjoying listening to naats, we&apos;d love a rating on the
            Play Store. It really helps us reach more people.
            </Text>

            <Pressable
              onPress={handleRate}
              style={{
                width: "100%",
                alignItems: "center",
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: colors.accent.primary,
              }}
              accessibilityRole="button"
              accessibilityLabel="Rate on the Play Store"
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="star-outline" size={18} color="#ffffff" />
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 15,
                    fontWeight: "700",
                    marginLeft: 8,
                  }}
                >
                  Rate on Play Store
                </Text>
              </View>
            </Pressable>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
                marginTop: 12,
              }}
            >
              <Pressable
                onPress={onNever}
                style={{ paddingVertical: 10, paddingHorizontal: 8 }}
                accessibilityRole="button"
                accessibilityLabel="No thanks"
              >
                <Text
                  style={{
                    color: colors.text.tertiary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  No thanks
                </Text>
              </Pressable>
              <Pressable
                onPress={onSnooze}
                style={{ paddingVertical: 10, paddingHorizontal: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Maybe later"
              >
                <Text
                  style={{
                    color: colors.text.secondary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Maybe later
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
