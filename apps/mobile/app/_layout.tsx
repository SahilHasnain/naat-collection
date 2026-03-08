import { AnimatedHeader } from "@/components/AnimatedHeader";
import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import FullPlayerModal from "@/components/FullPlayerModal";
import LiveRadioMiniPlayer from "@/components/LiveRadioMiniPlayer";
import MiniPlayer from "@/components/MiniPlayer";
import { colors } from "@/constants/theme";
import { AudioProvider, useAudioPlayer } from "@/contexts/AudioContext";
import {
    FilterModalProvider,
    useFilterModal,
} from "@/contexts/FilterModalContext";
import {
    HeaderVisibilityProvider,
    useHeaderVisibility,
} from "@/contexts/HeaderVisibilityContext.animated";
import {
    LiveRadioProvider,
    useLiveRadioPlayer,
} from "@/contexts/LiveRadioContext";
import {
    PlaybackModeProvider,
    usePlaybackMode,
} from "@/contexts/PlaybackModeContext";
import {
    SearchProvider,
    useSearch as useSearchContext,
} from "@/contexts/SearchContext";
import {
    TabBarVisibilityProvider,
    useTabBarVisibility,
} from "@/contexts/TabBarVisibilityContext.animated";
import { VideoProvider } from "@/contexts/VideoContext";
import { storageService } from "@/services/storage";
import { Ionicons } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import { Tabs, useRouter, useSegments } from "expo-router";
import React, { useState } from "react";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
  const router = useRouter();
  const segments = useSegments();
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const { currentAudio, stop } = useAudioPlayer();
  const { currentNaat } = useLiveRadioPlayer();
  const { isNormalAudioActive, isLiveRadioActive } = usePlaybackMode();
  const { translateY } = useTabBarVisibility();
  const { translateY: headerTranslateY } = useHeaderVisibility();
  const { setShowFilterModal } = useFilterModal();
  const { setShowSearchModal } = useSearchContext();

  // Check if user is currently on the live tab
  const isOnLiveTab = segments[0] === "live";

  // Check if user is on video screen
  const isOnVideoScreen = segments[0] === "video";

  // Check if user is on homepage (index) - only enable filter on homepage
  const isOnHomepage = segments[0] === undefined;

  // Shared value for header (must be called unconditionally)
  const isScrolledDownValue = useSharedValue(false);

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
      {/* Animated Header - Global across all screens except video */}
      {!isOnVideoScreen && (
        <AnimatedHeader
          translateY={headerTranslateY}
          isScrolledDown={isScrolledDownValue}
          query=""
          onChangeText={() => {}}
          selectedSort="forYou"
          selectedChannelId={null}
          selectedDuration="all"
          channels={[]}
          onFilterPress={() => setShowFilterModal(true)}
          onSearchPress={() => setShowSearchModal(true)}
          disableFilter={!isOnHomepage}
        />
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent.secondary,
          tabBarInactiveTintColor: colors.text.secondary,
        }}
        tabBar={(props) => (
          <AnimatedTabBar {...props} translateY={translateY} />
        )}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="live"
          options={{
            title: "Live",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "radio" : "radio-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "list" : "list-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="downloads"
          options={{
            title: "Downloads",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "cloud-download" : "cloud-download-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="video"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="+not-found"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Mini Player - Persistent across all screens (only show when normal audio is active and NOT on live tab) */}
      {isNormalAudioActive && currentAudio && !isOnLiveTab && (
        <MiniPlayer onExpand={() => setIsPlayerExpanded(true)} />
      )}

      {/* Live Radio Mini Player - Shows when live radio is active and user is NOT on live tab */}
      {isLiveRadioActive && currentNaat && !isOnLiveTab && (
        <LiveRadioMiniPlayer
          onExpand={() => {
            // Navigate to live tab when miniplayer is tapped
            router.push("/live");
          }}
        />
      )}

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
      <PlaybackModeProvider>
        <AudioProvider>
          <LiveRadioProvider>
            <VideoProvider>
              <ErrorBoundary>
                <SearchProvider>
                  <FilterModalProvider>
                    <HeaderVisibilityProvider headerHeight={140}>
                      <TabBarVisibilityProvider tabBarHeight={150}>
                        <RootLayoutContent />
                      </TabBarVisibilityProvider>
                    </HeaderVisibilityProvider>
                  </FilterModalProvider>
                </SearchProvider>
              </ErrorBoundary>
            </VideoProvider>
          </LiveRadioProvider>
        </AudioProvider>
      </PlaybackModeProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
