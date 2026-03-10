import { appwriteService } from "@/services/appwrite";
import { audioDownloadService } from "@/services/audioDownload";
import type { Naat } from "@/types";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { getPreferredAudioId, getPreferredDuration } from "@naat-collection/shared";
import React, { useState } from "react";

type DownloadState = {
  isDownloaded: boolean;
  isDownloading: boolean;
  progress: number;
};

export function useDownloadManager(displayData: Naat[]) {
  const [downloadStates, setDownloadStates] = useState<Record<string, DownloadState>>({});

  // Check download status for visible naats
  React.useEffect(() => {
    const checkDownloads = async () => {
      const updates: Record<string, DownloadState> = {};
      for (const naat of displayData) {
        const audioId = getPreferredAudioId(naat);
        if (audioId) {
          const downloaded = await audioDownloadService.isDownloaded(audioId);
          if (downloaded) {
            updates[naat.$id] = { isDownloaded: true, isDownloading: false, progress: 1 };
          }
        }
      }
      setDownloadStates((prev) => ({ ...prev, ...updates }));
    };
    checkDownloads();
  }, [displayData]);

  const handleDownload = React.useCallback(async (naat: Naat) => {
    const audioId = getPreferredAudioId(naat);
    if (!audioId) {
      showErrorToast("Audio not available for download");
      return;
    }

    const alreadyDownloaded = await audioDownloadService.isDownloaded(audioId);
    if (alreadyDownloaded) {
      showSuccessToast("Already downloaded");
      setDownloadStates((prev) => ({
        ...prev,
        [naat.$id]: { isDownloaded: true, isDownloading: false, progress: 1 },
      }));
      return;
    }

    setDownloadStates((prev) => ({
      ...prev,
      [naat.$id]: { isDownloaded: false, isDownloading: true, progress: 0 },
    }));

    try {
      const response = await appwriteService.getAudioUrl(audioId);
      if (!response.success || !response.audioUrl) {
        showErrorToast("Audio not available for download");
        setDownloadStates((prev) => ({
          ...prev,
          [naat.$id]: { isDownloaded: false, isDownloading: false, progress: 0 },
        }));
        return;
      }

      await audioDownloadService.downloadAudio(
        audioId,
        response.audioUrl,
        naat.youtubeId || "",
        naat.title,
        getPreferredDuration(naat),
        naat.channelName || "Unknown Channel",
        naat.views || 0,
        (progress) => {
          setDownloadStates((prev) => ({
            ...prev,
            [naat.$id]: { isDownloaded: false, isDownloading: true, progress: progress.progress },
          }));
        },
      );

      setDownloadStates((prev) => ({
        ...prev,
        [naat.$id]: { isDownloaded: true, isDownloading: false, progress: 1 },
      }));
      showSuccessToast("Downloaded successfully");
    } catch (error) {
      console.error("Download failed:", error);
      showErrorToast(error instanceof Error ? error.message : "Download failed");
      setDownloadStates((prev) => ({
        ...prev,
        [naat.$id]: { isDownloaded: false, isDownloading: false, progress: 0 },
      }));
    }
  }, []);

  return { downloadStates, handleDownload };
}
