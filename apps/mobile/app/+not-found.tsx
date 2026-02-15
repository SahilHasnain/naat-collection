import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Global 404 handler for expo-router.
 *
 * When the app is opened from a notification or any unknown path,
 * immediately redirect back to the Home screen instead of showing a 404.
 */
export default function NotFoundRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Replace the unknown route with the root route
    router.replace("/");
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-black">
      <ActivityIndicator size="small" color="#ffffff" />
    </View>
  );
}
