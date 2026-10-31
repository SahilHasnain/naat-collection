import { useAudioPlayer } from "@/contexts/AudioContext";
import { appwriteService } from "@/services/appwrite";
import { storageService } from "@/services/storage";
import { userProfileService } from "@/services/userProfile";
import type { Naat } from "@/types";
import { resolveAudioMetadata } from "@/utils/audioMetadata";
import { showQueueFeedback } from "@/utils/queueFeedback";
import { showErrorToast } from "@/utils/toast";
import { hasAudio } from "@naat-collection/shared";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Alert } from "react-native";

export function useNaatPlayback(displayData: Naat[]) {
  const router = useRouter();
  const {
    currentAudio,
    loadAndPlay,
    setAutoplayCallback,
    setTrackCompleteCallback,
    playNext: enqueuePlayNext,
    addToQueue: enqueueToQueue,
  } = useAudioPlayer();

  // Track the currently loaded naat to record completion signals
  const currentNaatRef = React.useRef<Naat | null>(null);

  // Map for quick naat lookup by ID
  const naatsMapRef = React.useRef<Map<string, Naat>>(new Map());
  React.useEffect(() => {
    naatsMapRef.current.clear();
    displayData.forEach((naat) => naatsMapRef.current.set(naat.$id, naat));
  }, [displayData]);

  // The queue can advance without loadAudioDirectly running, so keep the
  // completion signal pointed at whatever is actually playing.
  React.useEffect(() => {
    const naatId = currentAudio?.naatId;
    if (!naatId) return;
    const naat = naatsMapRef.current.get(naatId);
    if (naat) currentNaatRef.current = naat;
  }, [currentAudio?.naatId]);

  const getNaatById = React.useCallback(
    async (naatId: string): Promise<Naat | null> => {
      const cached = naatsMapRef.current.get(naatId);
      if (cached) {
        return cached;
      }

      try {
        return await appwriteService.getNaatById(naatId);
      } catch (error) {
        console.error(
          `[useNaatPlayback] Failed to fetch naat "${naatId}"`,
          error,
        );
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
      void appwriteService.incrementAppView(naat.$id).catch(() => {});
      router.push({
        pathname: "/video",
        params: {
          naatId: naat.$id,
          videoUrl:
            naat.videoUrl ||
            (naat.youtubeId
              ? `https://www.youtube.com/watch?v=${naat.youtubeId}`
              : ""),
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
        {
          text: "Play Video",
          onPress: () => navigateToVideo(naat, audioId, true),
        },
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

      // Record engagement signal for personalization
      currentNaatRef.current = naat;
      void userProfileService.recordPlay(naat).catch(() => {});

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
        const audioMetadata = await resolveAudioMetadata(naat);
        if (!audioMetadata) {
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

        console.log("[useNaatPlayback] Resolved audio:", {
          title: naat.title,
          audioId,
          isLocalFile: audioMetadata.isLocalFile,
        });
        await loadAndPlay(audioMetadata);
        void appwriteService.incrementAppView(naat.$id).catch(() => {});
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

  const resolveQueueAudio = React.useCallback(
    async (naatId: string) => {
      const naat = await getNaatById(naatId);
      if (!naat) {
        showErrorToast("Unable to find that naat");
        return null;
      }

      const audio = await resolveAudioMetadata(naat);
      if (!audio) {
        showErrorToast("Audio is not available for this naat");
        return null;
      }
      return audio;
    },
    [getNaatById],
  );

  /** Insert after the current track. */
  const playNext = React.useCallback(
    async (naatId: string) => {
      const audio = await resolveQueueAudio(naatId);
      if (!audio) return;
      showQueueFeedback(await enqueuePlayNext(audio), "next");
    },
    [enqueuePlayNext, resolveQueueAudio],
  );

  /** Append to the end of the queue. */
  const addToQueue = React.useCallback(
    async (naatId: string) => {
      const audio = await resolveQueueAudio(naatId);
      if (!audio) return;
      showQueueFeedback(await enqueueToQueue(audio), "queue");
    },
    [enqueueToQueue, resolveQueueAudio],
  );

  // Autoplay: pick random naat when current finishes
  useEffect(() => {
    const handleAutoplay = async () => {
      const available = displayData.filter((naat) => hasAudio(naat));
      if (available.length === 0) return;
      const randomNaat =
        available[Math.floor(Math.random() * available.length)];
      await loadAudioDirectly(randomNaat);
    };
    setAutoplayCallback(handleAutoplay);
    return () => setAutoplayCallback(null);
  }, [displayData, loadAudioDirectly, setAutoplayCallback]);

  // Record completion signal when a track finishes
  useEffect(() => {
    const handleTrackComplete = (naatId: string | undefined) => {
      const naat = currentNaatRef.current;
      if (!naat || (naatId && naat.$id !== naatId)) return;
      void userProfileService.recordCompletion(naat).catch(() => {});
    };
    setTrackCompleteCallback(handleTrackComplete);
    return () => setTrackCompleteCallback(null);
  }, [setTrackCompleteCallback]);

  const handleNaatPress = React.useCallback(
    async (naatId: string) => {
      const naat = await getNaatById(naatId);
      if (!naat) return;

      console.log(`[useNaatPlayback] Naat pressed: "${naat.title}"`, {
        cutAudio: naat.cutAudio,
        audioId: naat.audioId,
      });

      await storageService.addToWatchHistory(naat.$id);
      currentNaatRef.current = naat;
      void userProfileService.recordPlay(naat).catch(() => {});

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
      currentNaatRef.current = naat;
      void userProfileService.recordPlay(naat).catch(() => {});
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
    playNext,
    addToQueue,
  };
}
