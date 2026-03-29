import { AnimatedHeader } from "@/components/AnimatedHeader";
import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import FullPlayerModal from "@/components/FullPlayerModal";
import LiveRadioMiniPlayer from "@/components/LiveRadioMiniPlayer";
import MiniPlayer from "@/components/MiniPlayer";
import Pressable from "@/components/ResponsivePressable";
import { colors, layout } from "@/constants/theme";
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
import { useDeepLinking } from "@/hooks/useDeepLinking";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { storageService } from "@/services/storage";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Sentry from "@sentry/react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, useRouter, useSegments } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSharedValue, withTiming } from "react-native-reanimated";
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
  const router = useRouter();
  const segments = useSegments();

  // Initialize deep linking
  useDeepLinking();

  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const { currentAudio, stop } = useAudioPlayer();
  const { showMiniPlayer } = useLiveRadioPlayer();
  const { isNormalAudioActive, isLiveRadioActive } = usePlaybackMode();
  const { translateY } = useTabBarVisibility();
  const { translateY: headerTranslateY } = useHeaderVisibility();
  const { setShowFilterModal } = useFilterModal();
  const insets = useSafeAreaInsets();
  const {
    isSearchActive,
    activateSearch,
    deactivateSearch,
    searchInput,
    setSearchInput,
    submitSearch,
  } = useSearchContext();

  // Check if user is currently on the live tab
  const isOnLiveTab = segments[0] === "live";

  // Check if user is on video screen
  const isOnVideoScreen = segments[0] === "video";

  // Check if user is on homepage (home route) - only enable filter on homepage
  const isOnHomepage = segments[0] === "home" || segments[0] === undefined;

  // Network status for offline handling
  const { isConnected } = useNetworkStatus();
  const isFirstRender = useRef(true);
  const hasNavigatedOffline = useRef(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const prevConnected = useRef(isConnected);

  useEffect(() => {
    // On first render: if offline, navigate to downloads directly (app opened offline)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!isConnected) {
        hasNavigatedOffline.current = true;
        router.push("/downloads");
      }
      prevConnected.current = isConnected;
      return;
    }

    // Went offline while using the app → show modal
    if (!isConnected && prevConnected.current) {
      setShowOfflineModal(true);
      setShowBackOnline(false);
    }

    // Came back online → flash "Back online" bar
    if (isConnected && !prevConnected.current) {
      setShowOfflineModal(false);
      hasNavigatedOffline.current = false;
      setShowBackOnline(true);
      const timer = setTimeout(() => setShowBackOnline(false), 3000);
      prevConnected.current = isConnected;
      return () => clearTimeout(timer);
    }

    prevConnected.current = isConnected;
  }, [isConnected, router]);

  // Shared value for header (must be called unconditionally)
  const isScrolledDownValue = useSharedValue(false);

  // Shared value for network indicator offset — drives tab bar / mini player shift
  const networkIndicatorOffset = useSharedValue(0);

  // Animate the network indicator offset when visibility changes
  const isIndicatorVisible = !isConnected || showBackOnline;
  useEffect(() => {
    networkIndicatorOffset.value = withTiming(
      isIndicatorVisible ? layout.networkIndicatorHeight : 0,
      { duration: 200 },
    );
  }, [isIndicatorVisible, networkIndicatorOffset]);

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
          selectedSort="forYou"
          selectedChannelId={null}
          selectedDuration="all"
          channels={[]}
          onFilterPress={() => setShowFilterModal(true)}
          onSearchPress={() => {
            activateSearch();
            if (!isOnHomepage) {
              router.push("/home");
            }
          }}
          disableFilter={!isOnHomepage || isSearchActive}
          isSearchActive={isSearchActive}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearchSubmit={() => {
            const trimmed = searchInput.trim();
            if (trimmed) {
              setSearchInput(trimmed);
              submitSearch(trimmed);
            }
          }}
          onSearchClose={deactivateSearch}
        />
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent.secondary,
          tabBarInactiveTintColor: colors.text.secondary,
        }}
        tabBar={(props) => (
          <AnimatedTabBar
            {...props}
            translateY={translateY}
            networkIndicatorOffset={networkIndicatorOffset}
          />
        )}
      >
        <Tabs.Screen
          name="home"
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
          name="index"
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

      {/* Mini Player - Persistent across all screens (only show when normal audio is active and NOT on live tab or video screen) */}
      {isNormalAudioActive &&
        currentAudio &&
        !isOnLiveTab &&
        !isOnVideoScreen && (
          <MiniPlayer
            onExpand={() => setIsPlayerExpanded(true)}
            networkIndicatorOffset={networkIndicatorOffset}
          />
        )}

      {/* Naat Radio Mini Player - Shows when showMiniPlayer is true and user is NOT on live tab or video screen */}
      {(showMiniPlayer || isLiveRadioActive) &&
        !isOnLiveTab &&
        !isOnVideoScreen && (
          <LiveRadioMiniPlayer
            onExpand={() => {
              // Navigate to live tab when miniplayer is tapped
              router.push("/live");
            }}
            networkIndicatorOffset={networkIndicatorOffset}
          />
        )}

      {/* Full Player Modal */}
      <FullPlayerModal
        visible={isPlayerExpanded}
        onClose={() => setIsPlayerExpanded(false)}
        onSwitchToVideo={handleSwitchToVideo}
      />

      {/* Connection status bar — sits below tab bar, above system nav */}
      {(!isConnected || showBackOnline) && (
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom,
            left: 0,
            right: 0,
            backgroundColor: showBackOnline
              ? "#2e7d32"
              : colors.background.tertiary,
            paddingVertical: 2,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          accessibilityRole="alert"
          accessibilityLabel={showBackOnline ? "Back online" : "No connection"}
        >
          <Text
            style={{
              color: showBackOnline ? "#ffffff" : colors.text.secondary,
              fontSize: 12,
              fontWeight: "500",
            }}
          >
            {showBackOnline ? "Back online" : "No connection"}
          </Text>
        </View>
      )}

      {/* Offline modal — shown when connection drops while using the app */}
      {showOfflineModal && (
        <>
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.18)",
              zIndex: 1000,
            }}
          ></View>
          <View
            style={{
              position: "absolute",
              bottom: 56 + insets.bottom + 16,
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
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 4,
                }}
              >
                You are offline
              </Text>
              <Text
                style={{
                  color: colors.text.secondary,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                Watch downloads without a connection.
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <Pressable
                  onPress={() => setShowOfflineModal(false)}
                  style={{ paddingVertical: 8, paddingHorizontal: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss offline prompt"
                >
                  <Text
                    style={{
                      color: colors.accent.secondary,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    No thanks
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowOfflineModal(false);
                    router.push("/downloads");
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: colors.text.secondary,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Go to downloads"
                >
                  <Text
                    style={{
                      color: colors.text.primary,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    See your downloads
                  </Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        </>
      )}
    </>
  );
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
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
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
