import ErrorBoundary from "@/components/ErrorBoundary";
import FullPlayerModal from "@/components/FullPlayerModal";
import MiniPlayer from "@/components/MiniPlayer";
import VideoModal from "@/components/VideoModal";
import { colors } from "@/constants/theme";
import { AudioProvider, useAudioPlayer } from "@/contexts/AudioContext";
import { VideoProvider } from "@/contexts/VideoContext";
import { storageService } from "@/services/storage";
import { Ionicons } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import { Tabs } from "expo-router";
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
  tracesSampleRate: 1.0,
  integrations: [Sentry.reactNativeTracingIntegration()],
});

function RootLayoutContent() {
  const insets = useSafeAreaInsets();
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);
  const [videoData, setVideoData] = useState<{
    videoUrl: string;
    title: string;
    channelName: string;
    thumbnailUrl: string;
    youtubeId?: string;
    audioId?: string;
  } | null>(null);
  const { currentAudio, stop } = useAudioPlayer();

  // Handle switching from audio to video mode
  const handleSwitchToVideo = async () => {
    if (!currentAudio?.youtubeId) {
      console.log("[SwitchToVideo] No YouTube ID available");
      return;
    }

    console.log(
      "[SwitchToVideo] Switching to video mode for:",
      currentAudio.title
    );

    // Store video data before stopping audio (which clears currentAudio)
    const videoUrl = `https://www.youtube.com/watch?v=${currentAudio.youtubeId}`;
    setVideoData({
      videoUrl,
      title: currentAudio.title,
      channelName: currentAudio.channelName,
      thumbnailUrl: currentAudio.thumbnailUrl,
      youtubeId: currentAudio.youtubeId,
      audioId: currentAudio.audioId,
    });

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
      console.log("[SwitchToVideo] Opening video modal");
      // Open video modal
      setIsVideoModalVisible(true);
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

      {/* Video Modal - for switching from audio to video */}
      {videoData && (
        <VideoModal
          visible={isVideoModalVisible}
          onClose={() => {
            setIsVideoModalVisible(false);
            setVideoData(null);
          }}
          videoUrl={videoData.videoUrl}
          title={videoData.title}
          channelName={videoData.channelName}
          thumbnailUrl={videoData.thumbnailUrl}
          youtubeId={videoData.youtubeId}
          audioId={videoData.audioId}
          isFallback={false}
        />
      )}
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
