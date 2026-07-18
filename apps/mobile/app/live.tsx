/**
 * Naat Radio Screen
 *
 * 24/7 naat radio with synchronized playback
 */

import { colors, shadows } from "@/constants/theme";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext.animated";
import { useLiveRadioPlayer } from "@/contexts/LiveRadioContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LiveScreen() {
  const { isLoading, error, isPlaying, play, pause, refresh } =
    useLiveRadioPlayer();

  const isBuffering = isLoading && !isPlaying;

  const { showTabBar } = useTabBarVisibility();
  const { showHeader } = useHeaderVisibility();

  useFocusEffect(
    useCallback(() => {
      showTabBar();
      showHeader();
    }, [showTabBar, showHeader]),
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Pulse animation for live indicator
  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulseAnim]);

  // Expanding ring animations
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);

  useEffect(() => {
    if (isPlaying) {
      ring1.value = withRepeat(
        withDelay(
          0,
          withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      ring2.value = withRepeat(
        withDelay(
          800,
          withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      ring3.value = withRepeat(
        withDelay(
          1600,
          withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      ring1.value = 0;
      ring2.value = 0;
      ring3.value = 0;
    }
  }, [isPlaying, ring1, ring2, ring3]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: interpolate(pulseAnim.value, [1, 1.4], [1, 0.4]),
  }));

  const makeRingStyle = (sharedVal: Animated.SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: interpolate(sharedVal.value, [0, 1], [0.8, 1.6]) }],
      opacity: interpolate(sharedVal.value, [0, 0.3, 1], [0.5, 0.3, 0]),
    }));

  const ring1Style = makeRingStyle(ring1);
  const ring2Style = makeRingStyle(ring2);
  const ring3Style = makeRingStyle(ring3);

  const handlePlayLive = async () => {
    await play();
  };

  const handleStopLive = async () => {
    await pause(true);
  };

  if (error) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background.primary }]}
        edges={["top"]}
      >
        <View style={styles.errorIconContainer}>
          <Ionicons name="radio-outline" size={64} color={colors.text.disabled} />
        </View>
        <Text style={styles.errorTitle}>Naat Radio Unavailable</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          onPress={refresh}
          style={styles.retryButton}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor={colors.accent.primary}
              colors={[colors.accent.primary]}
            />
          }
        >
          <View style={styles.content}>
            {/* Live Badge */}
            {(isPlaying || isBuffering) && (
              <View style={styles.liveBadgeContainer}>
                <View style={styles.liveBadge}>
                  <Animated.View style={[styles.livePulse, pulseStyle]} />
                  <View
                    style={[
                      styles.liveDot,
                      { backgroundColor: isPlaying ? colors.accent.primary : colors.accent.warning },
                    ]}
                  />
                  <Text style={styles.liveText}>
                    {isBuffering ? "CONNECTING" : "LIVE"}
                  </Text>
                </View>
              </View>
            )}

            {/* Artwork with radio waves */}
            <View style={styles.artworkSection}>
              <View style={styles.radioWavesContainer}>
                <Animated.View style={[styles.radioWave, styles.radioWave1, ring1Style]} />
                <Animated.View style={[styles.radioWave, styles.radioWave2, ring2Style]} />
                <Animated.View style={[styles.radioWave, styles.radioWave3, ring3Style]} />
                <View style={styles.artworkCircle}>
                  <Image
                    source={require("@/assets/images/headphone-v1.png")}
                    style={styles.headphoneImage}
                    contentFit="contain"
                    transition={200}
                  />
                </View>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>Naat Radio</Text>
            <Text style={styles.subtitle}>24/7 Live Stream</Text>

            {/* Play/Pause Button */}
            <TouchableOpacity
              onPress={isPlaying ? handleStopLive : handlePlayLive}
              disabled={isBuffering}
              style={[
                styles.playButton,
                isPlaying && styles.playButtonActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? "Pause naat radio" : "Play naat radio"}
            >
              {isBuffering ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={36}
                  color="#fff"
                />
              )}
            </TouchableOpacity>


          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    minHeight: 600,
  },

  // Live badge
  liveBadgeContainer: {
    marginBottom: 40,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  livePulse: {
    position: "absolute",
    left: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.primary,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  liveText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  // Artwork / radio waves
  artworkSection: {
    marginBottom: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  radioWavesContainer: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  radioWave: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: colors.accent.primary,
  },
  radioWave1: {},
  radioWave2: {},
  radioWave3: {},
  artworkCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.background.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background.elevated,
    ...shadows.md,
  },
  headphoneImage: {
    width: 90,
    height: 90,
  },

  // Text
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.text.secondary,
    marginBottom: 40,
  },

  // Play button
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    ...shadows.accent,
  },
  playButtonActive: {
    backgroundColor: colors.accent.error,
    shadowColor: colors.accent.error,
  },


  // Error state
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.accent.error,
  },
  retryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
