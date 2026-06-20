import { colors, spacing } from "@/constants/theme";
import Pressable from "@/components/ResponsivePressable";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AppMessage } from "@/hooks/useAppMessage";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.owaisrazaqadri";

interface Props {
  message: AppMessage;
  onDismiss: () => void;
}

export default function AppMessageBanner({ message, onDismiss }: Props) {
  const handleUpdate = () => {
    Linking.openURL(message.link || PLAY_STORE_URL);
  };

  return (
    <>
      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.18)",
          zIndex: 1000,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 56 + 16,
          left: 16,
          right: 16,
          borderRadius: 12,
          overflow: "hidden",
          zIndex: 1001,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
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
          style={{ padding: 20 }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <Ionicons
              name={message.type === "alert" ? "warning" : "information-circle"}
              size={22}
              color={message.type === "alert" ? colors.accent.primary : colors.accent.secondary}
              style={{ marginTop: 1 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {message.message}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <Pressable
                  onPress={onDismiss}
                  style={{ paddingVertical: 8, paddingHorizontal: 12 }}
                >
                  <Text
                    style={{
                      color: colors.text.secondary,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    Dismiss
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleUpdate}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: colors.accent.primary,
                  }}
                >
                  <Text
                    style={{
                      color: colors.accent.primary,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    Update Now
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </>
  );
}
