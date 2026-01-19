import ErrorBoundary from "@/components/ErrorBoundary";
import FullPlayerModal from "@/components/FullPlayerModal";
import MiniPlayer from "@/components/MiniPlayer";
import { colors } from "@/constants/theme";
import { AudioProvider, useAudioPlayer } from "@/contexts/AudioContext";
import { VideoProvider } from "@/contexts/VideoContext";
import { storageService } from "@/services/storage";
import { Ionicons } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import { Tabs, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import "../global.css";

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false, // Disabled for cleaner console in development
  enabled: !__DEV__, // Disable Sentry in development mode
  tracesSampleRate: 1.0,
  integrations: [Sentry.reactNativeTracingIntegration()],
});

function RootLayoutContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const { currentAudio, stop } = useAudioPlayer();

  // Handle switching from audio to video mode
  const handleSwitchToVideo = async () => {
    if (!currentAudio?.youtubeId) {
      console.log("[SwitchToVideo] No YouTube ID available");
      return;
    }

    console.log(
      "[SwitchToVideo] Switching to video mode for:",
      currentAudio.title,
    );

    // Store video data before stopping audio (which clears currentAudio)
    const videoUrl = `https://www.youtube.com/watch?v=${currentAudio.youtubeId}`;
    const videoData = {
      videoUrl,
      title: currentAudio.title,
      channelName: currentAudio.channelName,
      thumbnailUrl: currentAudio.thumbnailUrl,
      youtubeId: currentAudio.youtubeId,
      audioId: currentAudio.audioId,
    };

    // Save video preference
    await storageService.savePlaybackMode("video").catch((error) => {
      console.error("Failed to save video mode preference:", error);
    });

    // Stop audio playback first
    await stop();

    // Close audio player
    setIsPlayerExpanded(false);

    // Small delay to ensure smooth transition
    setTimeout(() => {
      console.log("[SwitchToVideo] Navigating to video screen");
      // Navigate to video screen
      router.push({
        pathname: "/video",
        params: {
          videoUrl: videoData.videoUrl,
          title: videoData.title,
          channelName: videoData.channelName,
          thumbnailUrl: videoData.thumbnailUrl,
          youtubeId: videoData.youtubeId,
          audioId: videoData.audioId,
          isFallback: "false",
        },
      });
    }, 100);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent.secondary,
          tabBarInactiveTintColor: colors.text.secondary,
          tabBarStyle: {
            backgroundColor: colors.background.elevated,
            borderTopColor: colors.background.elevated,
            borderTopWidth: 1,
            height: 68 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="downloads"
          options={{
            title: "Downloads",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="download" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Mini Player - Persistent across all screens */}
      <MiniPlayer onExpand={() => setIsPlayerExpanded(true)} />

      {/* Full Player Modal */}
      <FullPlayerModal
        visible={isPlayerExpanded}
        onClose={() => setIsPlayerExpanded(false)}
        onSwitchToVideo={handleSwitchToVideo}
      />
    </>
  );
}

function RootLayout() {
  return (
    <SafeAreaProvider>
      <AudioProvider>
        <VideoProvider>
          <ErrorBoundary>
            <RootLayoutContent />
          </ErrorBoundary>
        </VideoProvider>
      </AudioProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
