import { AudioMetadata, useAudioPlayer } from "@/contexts/AudioContext";
import { appwriteService } from "@/services/appwrite";
import { audioDownloadService } from "@/services/audioDownload";
import { storageService } from "@/services/storage";
import type { Naat } from "@/types";
import { showErrorToast } from "@/utils/toast";
import { hasAudio } from "@naat-collection/shared";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Alert } from "react-native";

export function useNaatPlayback(displayData: Naat[]) {
  const router = useRouter();
  const { loadAndPlay, setAutoplayCallback } = useAudioPlayer();

  // Map for quick naat lookup by ID
  const naatsMapRef = React.useRef<Map<string, Naat>>(new Map());
  React.useEffect(() => {
    naatsMapRef.current.clear();
    displayData.forEach((naat) => naatsMapRef.current.set(naat.$id, naat));
  }, [displayData]);

  const navigateToVideo = React.useCallback(
    (
      naat: Naat,
      audioId: string | undefined,
      isFallback: boolean,
      preservePreference: boolean = false,
    ) => {
      router.push({
        pathname: "/video",
        params: {
          videoUrl: naat.videoUrl,
          title: naat.title,
          channelName: naat.channelName,
          thumbnailUrl: naat.thumbnailUrl,
          duration: String(naat.duration),
          youtubeId: naat.youtubeId,
          audioId: audioId,
          isFallback: isFallback || preservePreference ? "true" : "false",
        },
      });
    },
    [router],
  );

  const showVideoFallbackAlert = React.useCallback(
    (naat: Naat, audioId: string | undefined, message: string) => {
      Alert.alert("Audio Not Available", message, [
        { text: "Cancel", style: "cancel", onPress: () => showErrorToast("Playback cancelled") },
        { text: "Play Video", onPress: () => navigateToVideo(naat, audioId, true) },
      ]);
    },
    [navigateToVideo],
  );

  const loadAudioDirectly = React.useCallback(
    async (naat: Naat) => {
      await storageService.addToWatchHistory(naat.$id);
      
      // Always prioritize cutAudio over audioId
      const audioId = naat.cutAudio || naat.audioId;

      if (!audioId) {
        showVideoFallbackAlert(
          naat, audioId,
          "Audio is not available for this content. Would you like to play the video instead?",
        );
        return;
      }

      console.log(`[useNaatPlayback] Playing audio for "${naat.title}":`, {
        audioId,
        isCutAudio: !!naat.cutAudio,
        hasOriginalAudio: !!naat.audioId,
      });

      try {
        let audioUrl: string;
        let isLocalFile = false;
        const downloaded = await audioDownloadService.isDownloaded(audioId);

        if (downloaded) {
          audioUrl = audioDownloadService.getLocalPath(audioId);
          isLocalFile = true;
          console.log(`[useNaatPlayback] Using downloaded audio: ${audioUrl}`);
        } else {
          const response = await appwriteService.getAudioUrl(audioId);
          if (response.success && response.audioUrl) {
            audioUrl = response.audioUrl;
            console.log(`[useNaatPlayback] Fetched audio URL from server`);
          } else {
            showVideoFallbackAlert(
              naat, audioId,
              "Audio is not available for this content. Would you like to play the video instead?",
            );
            return;
          }
        }

        const audioMetadata: AudioMetadata = {
          audioUrl,
          title: naat.title,
          channelName: naat.channelName,
          thumbnailUrl: naat.thumbnailUrl,
          isLocalFile,
          audioId,
          youtubeId: naat.youtubeId,
          naatId: naat.$id,
        };
        await loadAndPlay(audioMetadata);
      } catch (err) {
        console.error("Failed to load audio:", err);
        showVideoFallbackAlert(
          naat, audioId,
          "Unable to load audio. Would you like to play the video instead?",
        );
      }
    },
    [loadAndPlay, showVideoFallbackAlert],
  );

  // Autoplay: pick random naat when current finishes
  useEffect(() => {
    const handleAutoplay = async () => {
      const available = displayData.filter((naat) => hasAudio(naat));
      if (available.length === 0) return;
      const randomNaat = available[Math.floor(Math.random() * available.length)];
      await loadAudioDirectly(randomNaat);
    };
    setAutoplayCallback(handleAutoplay);
    return () => setAutoplayCallback(null);
  }, [displayData, loadAudioDirectly, setAutoplayCallback]);

  const handleNaatPress = React.useCallback(
    async (naatId: string) => {
      const naat = naatsMapRef.current.get(naatId);
      if (!naat) return;
      
      console.log(`[useNaatPlayback] Naat pressed: "${naat.title}"`, {
        cutAudio: naat.cutAudio,
        audioId: naat.audioId,
      });
      
      await storageService.addToWatchHistory(naat.$id);

      try {
        const savedMode = await storageService.loadPlaybackMode();
        if (savedMode === "video") {
          // For video mode, use cutAudio if available
          const preferredAudioId = naat.cutAudio || naat.audioId;
          navigateToVideo(naat, preferredAudioId, false);
        } else {
          await loadAudioDirectly(naat);
        }
      } catch {
        await loadAudioDirectly(naat);
      }
    },
    [loadAudioDirectly, navigateToVideo],
  );

  const playAsAudio = React.useCallback(
    async (naatId: string) => {
      const naat = naatsMapRef.current.get(naatId);
      if (!naat) return;
      await loadAudioDirectly(naat);
    },
    [loadAudioDirectly],
  );

  const playAsVideo = React.useCallback(
    async (naatId: string) => {
      const naat = naatsMapRef.current.get(naatId);
      if (!naat) return;

      await storageService.addToWatchHistory(naat.$id);
      const preferredAudioId = naat.cutAudio || naat.audioId;
      navigateToVideo(naat, preferredAudioId, false, true);
    },
    [navigateToVideo],
  );

  return { handleNaatPress, loadAudioDirectly, playAsAudio, playAsVideo };
}
