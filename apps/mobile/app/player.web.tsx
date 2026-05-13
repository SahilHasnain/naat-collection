import FullPlayerModal from "@/components/FullPlayerModal";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { storageService } from "@/services/storage";
import { Redirect, useRouter } from "expo-router";
import React, { useCallback } from "react";

export default function PlayerWebScreen() {
  const router = useRouter();
  const { currentAudio, stop } = useAudioPlayer();

  const handleSwitchToVideo = useCallback(async () => {
    if (!currentAudio?.youtubeId) {
      return;
    }

    await storageService.savePlaybackMode("video").catch(() => {});
    await stop();

    router.replace({
      pathname: "/video",
      params: {
        naatId: currentAudio.naatId,
        videoUrl: `https://www.youtube.com/watch?v=${currentAudio.youtubeId}`,
        title: currentAudio.title,
        channelName: currentAudio.channelName,
        thumbnailUrl: currentAudio.thumbnailUrl,
        youtubeId: currentAudio.youtubeId,
        audioId: currentAudio.audioId,
        isFallback: "false",
      },
    });
  }, [currentAudio, router, stop]);

  if (!currentAudio) {
    return <Redirect href="/home" />;
  }

  return <FullPlayerModal onSwitchToVideo={handleSwitchToVideo} />;
}
