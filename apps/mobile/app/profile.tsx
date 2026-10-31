import { GOOGLE_ICON } from "@/brands/assets";
import Pressable from "@/components/ResponsivePressable";
import { colors } from "@/constants/theme";
import { BRAND_LINKS, APP_NAME } from "@/config/brand";
import { features } from "@/config/features";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isSigningIn, signInWithGoogle, signOut } = useAuth();

  const displayName = user?.name?.trim() || user?.email || "Guest";
  const initial = displayName.charAt(0).toUpperCase();
  const youtubeUrl = BRAND_LINKS?.youtube;
  const websiteUrl = BRAND_LINKS?.website;

  // Brands that hide the profile entry point shouldn't expose the screen either
  // (e.g. direct URL access on web).
  if (!features.showProfileTab) {
    return <Redirect href="/home" />;
  }

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: colors.background.primary }}
    >
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-3 pt-2"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border.secondary }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-3 items-center justify-center rounded-full"
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 36,
            height: 36,
            backgroundColor: colors.background.secondary,
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
        </Pressable>
        <Text style={{ color: colors.text.primary, fontSize: 20, fontWeight: "700" }}>
          Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account summary */}
        <View
          className="flex-row items-center"
          style={{
            padding: 18,
            borderRadius: 16,
            backgroundColor: colors.background.secondary,
            borderWidth: 1,
            borderColor: colors.border.secondary,
          }}
        >
          <View
            className="items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.accent.primary + "20",
            }}
          >
            {user ? (
              <Text
                style={{
                  color: colors.accent.primary,
                  fontSize: 22,
                  fontWeight: "700",
                }}
              >
                {initial}
              </Text>
            ) : (
              <Ionicons name="person-outline" size={26} color={colors.accent.primary} />
            )}
          </View>
          <View className="ml-4 flex-1">
            <Text
              style={{ color: colors.text.primary, fontSize: 17, fontWeight: "700" }}
              numberOfLines={1}
            >
              {user ? displayName : "Not signed in"}
            </Text>
            <Text
              style={{ marginTop: 4, color: colors.text.secondary, fontSize: 13 }}
              numberOfLines={1}
            >
              {user?.email ?? "Sign in to sync your account and favorites."}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {user ? (
          <Pressable
            onPress={() => void signOut()}
            className="flex-row items-center justify-center rounded-full px-4 py-3"
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={{
              borderWidth: 1,
              borderColor: colors.border.primary,
              backgroundColor: colors.background.secondary,
            }}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={colors.accent.error}
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: colors.accent.error, fontSize: 15, fontWeight: "600" }}>
              Sign out
            </Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={isSigningIn}
            onPress={() => void signInWithGoogle()}
            className="flex-row items-center justify-center rounded-full px-4 py-3"
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            style={{
              backgroundColor: colors.accent.primary,
              opacity: isSigningIn ? 0.7 : 1,
            }}
          >
            {isSigningIn ? (
              <ActivityIndicator color={colors.text.primary} />
            ) : (
              <>
                <Image
                  source={GOOGLE_ICON}
                  style={{ width: 22, height: 22, marginRight: 10 }}
                  contentFit="contain"
                />
                <Text
                  style={{ color: colors.text.primary, fontSize: 15, fontWeight: "600" }}
                >
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* Brand links — opt-in per brand via features.showBrandLinks */}
        {features.showBrandLinks && (youtubeUrl || websiteUrl) && (
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  marginTop: 8,
                  color: colors.text.secondary,
                  fontSize: 13,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Connect with {APP_NAME}
              </Text>
              {youtubeUrl && (
                <Pressable
                  onPress={() => void Linking.openURL(youtubeUrl).catch(() => {})}
                  className="flex-row items-center rounded-full px-4 py-3"
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${APP_NAME} on YouTube`}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border.secondary,
                    backgroundColor: colors.background.secondary,
                  }}
                >
                  <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                  <Text
                    className="ml-3 flex-1"
                    style={{ color: colors.text.primary, fontSize: 15, fontWeight: "600" }}
                  >
                    YouTube Channel
                  </Text>
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={colors.text.tertiary}
                  />
                </Pressable>
              )}
              {websiteUrl && (
                <Pressable
                  onPress={() => void Linking.openURL(websiteUrl).catch(() => {})}
                  className="flex-row items-center rounded-full px-4 py-3"
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${APP_NAME} website`}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border.secondary,
                    backgroundColor: colors.background.secondary,
                  }}
                >
                  <Ionicons name="globe-outline" size={20} color={colors.accent.secondary} />
                  <Text
                    className="ml-3 flex-1"
                    style={{ color: colors.text.primary, fontSize: 15, fontWeight: "600" }}
                  >
                    Website
                  </Text>
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={colors.text.tertiary}
                  />
                </Pressable>
              )}
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}
