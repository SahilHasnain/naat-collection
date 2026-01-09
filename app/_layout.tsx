import ErrorBoundary from "@/components/ErrorBoundary";
import FullPlayerModal from "@/components/FullPlayerModal";
import MiniPlayer from "@/components/MiniPlayer";
import { colors } from "@/constants/theme";
import { AudioProvider } from "@/contexts/AudioContext";
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

function RootLayout() {
  const insets = useSafeAreaInsets();
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  return (
    <SafeAreaProvider>
      <AudioProvider>
        <ErrorBoundary>
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
          />
        </ErrorBoundary>
      </AudioProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
