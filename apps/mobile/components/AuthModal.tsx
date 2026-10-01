import { colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";
import { Image } from "expo-image";
import Pressable from "./ResponsivePressable";

export function AuthModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user, isSigningIn, signInWithGoogle, signOut } = useAuth();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.72)" }}
      >
        <View
          className="w-full max-w-sm rounded-2xl p-6"
          style={{ backgroundColor: colors.background.secondary }}
        >
          <Text className="text-xl font-semibold" style={{ color: colors.text.primary }}>
            {user ? "Your account" : "Sign in"}
          </Text>
          <Text className="mt-2" style={{ color: colors.text.secondary }}>
            {user?.email ?? "Sign in to keep your account and favorites synced."}
          </Text>

          {user ? (
            <Pressable
              onPress={() => void signOut().then(onClose)}
              className="mt-6 items-center rounded-full px-4 py-3"
              style={{ backgroundColor: colors.accent.primary }}
            >
              <Text className="font-semibold" style={{ color: colors.text.primary }}>
                Sign out
              </Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={isSigningIn}
              onPress={() => void signInWithGoogle()}
              className="mt-6 flex-row items-center justify-center rounded-full px-4 py-3"
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
                    source={require("@/assets/images/google.png")}
                    style={{ width: 24, height: 24, marginRight: 10 }}
                    contentFit="contain"
                  />
                  <Text className="font-semibold" style={{ color: colors.text.primary }}>
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable onPress={onClose} className="mt-3 items-center px-4 py-2">
            <Text style={{ color: colors.text.secondary }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
