import LiveRadioMiniPlayer from "@/components/LiveRadioMiniPlayer";
import MiniPlayer from "@/components/MiniPlayer";
import { AudioProvider, useAudioPlayer } from "@/contexts/AudioContext";
import { FilterModalProvider } from "@/contexts/FilterModalContext";
import { LiveRadioProvider, useLiveRadioPlayer } from "@/contexts/LiveRadioContext";
import { PlaybackModeProvider, usePlaybackMode } from "@/contexts/PlaybackModeContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { VideoProvider } from "@/contexts/VideoContext";
import { Ionicons } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link, Slot, usePathname } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false,
  enabled: !__DEV__,
  tracesSampleRate: 1.0,
  integrations: [Sentry.reactNativeTracingIntegration()],
});

const navItems = [
  { href: "/home", label: "Home", icon: "grid-outline" },
  { href: "/live", label: "Live", icon: "radio-outline" },
  { href: "/history", label: "History", icon: "time-outline" },
] as const;

function DesktopShell() {
  const pathname = usePathname();
  const { currentAudio } = useAudioPlayer();
  const { showMiniPlayer } = useLiveRadioPlayer();
  const { isNormalAudioActive, isLiveRadioActive } = usePlaybackMode();
  const isPlayerRoute = pathname === "/player";

  return (
    <View style={{ flex: 1, backgroundColor: "#071018" }}>
      <LinearGradient
        colors={["#0d1b29", "#071018", "#05080c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View
          style={{
            width: 260,
            borderRightWidth: 1,
            borderRightColor: "rgba(255,255,255,0.08)",
            backgroundColor: "rgba(6, 10, 16, 0.78)",
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 24,
          }}
        >
          <View style={{ marginBottom: 28 }}>
            <Text style={{ color: "#f6f7fb", fontSize: 26, fontWeight: "700" }}>
              Owais Raza Qadri
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link key={item.href} href={item.href as never} asChild>
                  <Pressable
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderRadius: 16,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      backgroundColor: active
                        ? "rgba(37, 99, 235, 0.18)"
                        : "transparent",
                      borderWidth: 1,
                      borderColor: active
                        ? "rgba(96, 165, 250, 0.35)"
                        : "rgba(255,255,255,0.06)",
                    }}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={active ? "#cfe3ff" : "rgba(255,255,255,0.72)"}
                    />
                    <Text
                      style={{
                        color: active ? "#f8fbff" : "rgba(255,255,255,0.8)",
                        fontSize: 15,
                        fontWeight: active ? "700" : "500",
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              minHeight: "100%",
              padding: 28,
              paddingBottom: 140,
            }}
            showsVerticalScrollIndicator={false}
          >
            <Slot />
          </ScrollView>
        </View>
      </View>

      {!isPlayerRoute && isNormalAudioActive && currentAudio ? (
        <MiniPlayer onExpand={() => {}} networkIndicatorOffset={{ value: 0 } as any} />
      ) : null}
      {!isPlayerRoute && (showMiniPlayer || isLiveRadioActive) ? (
        <LiveRadioMiniPlayer
          onExpand={() => {}}
          networkIndicatorOffset={{ value: 0 } as any}
        />
      ) : null}
    </View>
  );
}

function RootLayout() {
  return (
    <SafeAreaProvider>
      <PlaybackModeProvider>
        <AudioProvider>
          <LiveRadioProvider>
            <VideoProvider>
              <SearchProvider>
                <FilterModalProvider>
                  <DesktopShell />
                </FilterModalProvider>
              </SearchProvider>
            </VideoProvider>
          </LiveRadioProvider>
        </AudioProvider>
      </PlaybackModeProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
