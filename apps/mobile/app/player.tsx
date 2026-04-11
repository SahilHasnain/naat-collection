import FullPlayerModal from "@/components/FullPlayerModal";
import { layout } from "@/constants/theme";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext.animated";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { storageService } from "@/services/storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PLAYER_HEADER_OFFSET = 84;

export default function PlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentAudio, stop } = useAudioPlayer();
  const { showTabBar } = useTabBarVisibility();
  const { showHeader } = useHeaderVisibility();

  useFocusEffect(
    useCallback(() => {
      showTabBar();
      showHeader();
    }, [showHeader, showTabBar]),
  );

  useEffect(() => {
    if (!currentAudio) {
      router.replace("/home");
    }
  }, [currentAudio, router]);

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
