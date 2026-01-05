import EmptyState from "@/components/EmptyState";
import VideoPlayer from "@/components/VideoPlayer";
import { usePlaybackPosition } from "@/hooks/usePlaybackPosition";
import { appwriteService } from "@/services/appwrite";
import type { Naat } from "@/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PlayerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // State management
  const [naat, setNaat] = useState<Naat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [startPosition, setStartPosition] = useState(0);

  // Playback position hook
  const { savedPosition, savePosition, clearPosition } =
    usePlaybackPosition(id);

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

        // Check if there's a saved position
        if (savedPosition && savedPosition > 0) {
          setShowResumePrompt(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load naat"));
      } finally {
        setLoading(false);
      }
    };

    fetchNaat();
  }, [id, savedPosition]);

  // Handle resume playback
  const handleResume = () => {
    if (savedPosition) {
      setStartPosition(savedPosition);
    }
    setShowResumePrompt(false);
  };

  // Handle start from beginning
  const handleStartFromBeginning = () => {
    setStartPosition(0);
    clearPosition();
    setShowResumePrompt(false);
  };

  // Handle position changes during playback
  const handlePositionChange = (position: number) => {
    savePosition(position);
  };

  // Handle video completion
  const handleComplete = () => {
    clearPosition();
  };

  // Handle playback errors
  const handleError = (err: Error) => {
    Alert.alert(
      "Playback Error",
      err.message || "Unable to play video. Please try another naat.",
      [
        {
          text: "Go Back",
          onPress: () => router.back(),
        },
        {
          text: "Retry",
          onPress: () => {
            setError(null);
            setLoading(true);
            // Trigger re-fetch
            if (id) {
              appwriteService
                .getNaatById(id)
                .then((naatData) => {
                  setNaat(naatData);
                  setLoading(false);
                })
                .catch((fetchErr) => {
                  setError(
                    fetchErr instanceof Error
                      ? fetchErr
                      : new Error("Failed to load naat")
                  );
                  setLoading(false);
                });
            }
          },
        },
      ]
    );
  };

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

  // Resume prompt overlay
  if (showResumePrompt) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-full max-w-md rounded-2xl bg-neutral-900 p-8 border border-neutral-700">
            <Text className="mb-3 text-center text-2xl font-bold text-white">
              Resume Playback?
            </Text>
            <Text className="mb-8 text-center text-base text-neutral-300">
              You were at {Math.floor((savedPosition || 0) / 60)}:
              {String((savedPosition || 0) % 60).padStart(2, "0")}
            </Text>

            <Pressable
              onPress={handleResume}
              className="mb-4 rounded-xl bg-primary-600 py-4 active:bg-primary-700"
              style={{
                shadowColor: "#2563eb",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Text className="text-center text-base font-bold text-white tracking-wide">
                Resume
              </Text>
            </Pressable>

            <Pressable
              onPress={handleStartFromBeginning}
              className="rounded-xl bg-neutral-700 py-4 active:bg-neutral-600 border border-neutral-600"
            >
              <Text className="text-center text-base font-bold text-white tracking-wide">
                Start from Beginning
              </Text>
            </Pressable>
          </View>
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
      <VideoPlayer
        videoUrl={naat.videoUrl}
        initialPosition={startPosition}
        onPositionChange={handlePositionChange}
        onComplete={handleComplete}
        onError={handleError}
      />
    </SafeAreaView>
  );
}
