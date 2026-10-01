import { colors } from "@/constants/theme";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const libraryItems = [
  {
    label: "Favorites",
    description: "Naats you want to come back to",
    icon: "heart-outline" as const,
    route: "/favorites",
  },
  {
    label: "Downloads",
    description: "Audio saved for offline listening",
    icon: "cloud-download-outline" as const,
    route: "/downloads",
  },
] as const;

export default function LibraryScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20 }}>
        <Text
          style={{
            color: colors.text.primary,
            fontSize: 28,
            fontWeight: "700",
          }}
        >
          Library
        </Text>
        <Text
          style={{
            marginTop: 6,
            color: colors.text.secondary,
            fontSize: 14,
          }}
        >
          Your saved and recently played naats
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {libraryItems.map((item) => (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              padding: 18,
              borderRadius: 16,
              backgroundColor: colors.background.secondary,
              borderWidth: 1,
              borderColor: colors.border.secondary,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View
              style={{
                width: 46,
                height: 46,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 23,
                backgroundColor: colors.accent.primary + "20",
              }}
            >
              <Ionicons
                name={item.icon}
                size={23}
                color={colors.accent.primary}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                {item.label}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  color: colors.text.secondary,
                  fontSize: 13,
                }}
              >
                {item.description}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.text.tertiary}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
