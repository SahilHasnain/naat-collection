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

  const getNaatById = React.useCallback(
    async (naatId: string): Promise<Naat | null> => {
      const cached = naatsMapRef.current.get(naatId);
      if (cached) {
        return cached;
      }

      try {
        return await appwriteService.getNaatById(naatId);
      } catch (error) {
        console.error(`[useNaatPlayback] Failed to fetch naat "${naatId}"`, error);
        return null;
      }
    },
    [],
  );

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
        // Intentionally no cancel toast here. "Playback cancelled" is noise and was removed on purpose;
        // keep it absent so future edits do not reintroduce it from prior assumptions.
        { text: "Cancel", style: "cancel" },
        { text: "Play Video", onPress: () => navigateToVideo(naat, audioId, true) },
      ]);
    },
    [navigateToVideo],
  );

  const loadAudioDirectly = React.useCallback(
    async (
      naat: Naat,
      fallbackMode: "alert" | "auto-video" = "alert",
    ): Promise<boolean> => {
      await storageService.addToWatchHistory(naat.$id);

      // Always prioritize cutAudio over audioId
      const audioId = naat.cutAudio || naat.audioId;

      if (!audioId) {
        if (fallbackMode === "auto-video") {
          navigateToVideo(naat, audioId, true);
        } else {
          showVideoFallbackAlert(
            naat,
            audioId,
            "Audio is not available for this content. Would you like to play the video instead?",
          );
        }
        return false;
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
            if (fallbackMode === "auto-video") {
              navigateToVideo(naat, audioId, true);
            } else {
              showVideoFallbackAlert(
                naat,
                audioId,
                "Audio is not available for this content. Would you like to play the video instead?",
              );
            }
            return false;
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
        return true;
      } catch (err) {
        console.error("Failed to load audio:", err);
        if (fallbackMode === "auto-video") {
          navigateToVideo(naat, audioId, true);
        } else {
          showVideoFallbackAlert(
            naat,
            audioId,
            "Unable to load audio. Would you like to play the video instead?",
          );
        }
        return false;
      }
    },
    [loadAndPlay, navigateToVideo, showVideoFallbackAlert],
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
      const naat = await getNaatById(naatId);
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
    [getNaatById, loadAudioDirectly, navigateToVideo],
  );

  const playAsAudio = React.useCallback(
    async (naatId: string) => {
      const naat = await getNaatById(naatId);
      if (!naat) return;
      await loadAudioDirectly(naat);
    },
    [getNaatById, loadAudioDirectly],
  );

  const playAsVideo = React.useCallback(
    async (naatId: string) => {
      const naat = await getNaatById(naatId);
      if (!naat) return;

      await storageService.addToWatchHistory(naat.$id);
      const preferredAudioId = naat.cutAudio || naat.audioId;
      navigateToVideo(naat, preferredAudioId, false, true);
    },
    [getNaatById, navigateToVideo],
  );

  const playSharedNaatById = React.useCallback(
    async (naatId: string) => {
      const naat = await getNaatById(naatId);
      if (!naat) {
        showErrorToast("Unable to open shared naat");
        return false;
      }

      return loadAudioDirectly(naat, "auto-video");
    },
    [getNaatById, loadAudioDirectly],
  );

  return {
    handleNaatPress,
    loadAudioDirectly,
    playAsAudio,
    playAsVideo,
    playSharedNaatById,
  };
}
