import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";

const APP_SCHEME = "ubaidraza";

export default function SharedNaatRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    naatId?: string;
    youtubeId?: string;
  }>();
  const hasHandledRef = React.useRef(false);

  React.useEffect(() => {
    const naatId = typeof params.naatId === "string" ? params.naatId : undefined;
    const youtubeId =
      typeof params.youtubeId === "string" ? params.youtubeId : undefined;

    if (!naatId || hasHandledRef.current) {
      return;
    }

    hasHandledRef.current = true;

    const appUrl = `${APP_SCHEME}://naat/${naatId}${
      youtubeId ? `?youtubeId=${encodeURIComponent(youtubeId)}` : ""
    }`;
    const youtubeUrl = youtubeId
      ? `https://youtu.be/${youtubeId}`
      : "https://www.youtube.com";

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const fallbackTimer = window.setTimeout(() => {
        window.location.replace(youtubeUrl);
      }, 1500);

      window.location.replace(appUrl);

      return () => window.clearTimeout(fallbackTimer);
    }

    router.replace({
      pathname: "/home",
      params: {
        autoPlayNaatId: naatId,
        youtubeId: youtubeId || "",
      },
    });
  }, [params.naatId, params.youtubeId, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={styles.title}>Opening shared naat</Text>
      <Text style={styles.subtitle}>
        {Platform.OS === "web"
          ? "Redirecting to the app or YouTube..."
          : "Preparing playback..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});
