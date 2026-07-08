import FullPlayerModal from "@/components/FullPlayerModal";
import { layout } from "@/constants/theme";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext.animated";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { storageService } from "@/services/storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PLAYER_HEADER_OFFSET = 84;

export default function PlayerScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { source } = useGlobalSearchParams<{ source: string }>();
  const insets = useSafeAreaInsets();
  const { currentAudio, stop } = useAudioPlayer();
  const { showTabBar } = useTabBarVisibility();
  const { showHeader } = useHeaderVisibility();
  const isHandlingClose = useRef(false);

  useFocusEffect(
    useCallback(() => {
      showTabBar();
      showHeader();
    }, [showHeader, showTabBar]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isHandlingClose.current) return;
      e.preventDefault();
      const target = source && source !== "player" ? "/" + source : "/home";
      router.replace(target);
    });
    return unsubscribe;
  }, [navigation, router, source]);

  useEffect(() => {
    if (!currentAudio && !isHandlingClose.current) {
      isHandlingClose.current = true;
      const target = source && source !== "player" ? "/" + source : "/home";
      router.replace(target);
    }
  }, [currentAudio, router, source]);

  const handleSwitchToVideo = useCallback(async () => {
    if (!currentAudio?.youtubeId) {
      return;
    }

    const videoData = {
      videoUrl: `https://www.youtube.com/watch?v=${currentAudio.youtubeId}`,
      title: currentAudio.title,
      channelName: currentAudio.channelName,
      thumbnailUrl: currentAudio.thumbnailUrl,
      youtubeId: currentAudio.youtubeId,
      audioId: currentAudio.audioId,
    };

    await storageService.savePlaybackMode("video").catch(() => {});
    isHandlingClose.current = true;
    await stop();

    router.replace({
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
  }, [currentAudio, router, stop]);

  if (!currentAudio) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <FullPlayerModal
      onSwitchToVideo={handleSwitchToVideo}
      topInset={PLAYER_HEADER_OFFSET}
      bottomInset={layout.tabBarHeight + insets.bottom}
    />
  );
}
