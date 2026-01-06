import EmptyState from "@/components/EmptyState";
import VideoPlayer from "@/components/VideoPlayer";
import { appwriteService } from "@/services/appwrite";
import type { Naat } from "@/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PlayerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // State management
  const [naat, setNaat] = useState<Naat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch naat details on mount
  useEffect(() => {
    if (!id) {
      setError(new Error("Invalid naat ID"));
      setLoading(false);
      return;
    }

    const fetchNaat = async () => {
      try {
        setLoading(true);
        setError(null);

        const naatData = await appwriteService.getNaatById(id);
        setNaat(naatData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load naat"));
      } finally {
        setLoading(false);
      }
    };

    fetchNaat();
  }, [id]);

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="mt-4 text-base text-white">Loading naat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !naat) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            message={error?.message || "Unable to load naat. Please try again."}
            icon="⚠️"
            actionLabel="Go Back"
            onAction={handleBack}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Main player view
  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header with back button and title */}
      <View className="bg-black/95 px-6 py-4 border-b border-neutral-800">
        <View className="flex-row items-center">
          <Pressable
            onPress={handleBack}
            className="mr-4 rounded-full bg-white/20 p-3 active:bg-white/30"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text className="text-xl text-white font-bold">←</Text>
          </Pressable>

          <View className="flex-1">
            <Text
              className="text-lg font-bold text-white leading-snug"
              numberOfLines={1}
            >
              {naat.title}
            </Text>
            <Text className="text-sm text-neutral-400 mt-0.5">
              {naat.reciterName}
            </Text>
          </View>
        </View>
      </View>

      {/* Video player */}
      <VideoPlayer videoUrl={naat.videoUrl} />
    </SafeAreaView>
  );
}
