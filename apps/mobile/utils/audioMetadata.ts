import type { AudioMetadata } from "@/contexts/AudioContext";
import { appwriteService } from "@/services/appwrite";
import { audioDownloadService } from "@/services/audioDownload";
import type { Naat } from "@/types";

/**
 * Resolves a naat into everything the player needs in order to queue it.
 *
 * Queue entries resolve their URL up front on purpose: if the audio turns out
 * to be unavailable when the track is about to start there is no UI left to
 * offer the video fallback, so the failure has to surface at enqueue time.
 *
 * Returns null when the naat has no audio or the URL cannot be resolved.
 */
export async function resolveAudioMetadata(
  naat: Naat,
): Promise<AudioMetadata | null> {
  // Always prioritise cutAudio over audioId, matching playback.
  const audioId = naat.cutAudio || naat.audioId;
  if (!audioId) return null;

  const base = {
    title: naat.title,
    channelName: naat.channelName,
    thumbnailUrl: naat.thumbnailUrl,
    audioId,
    youtubeId: naat.youtubeId,
    naatId: naat.$id,
    views: naat.views || 0,
  };

  try {
    if (await audioDownloadService.isDownloaded(audioId)) {
      return {
        ...base,
        audioUrl: audioDownloadService.getLocalPath(audioId),
        isLocalFile: true,
      };
    }

    const response = await appwriteService.getAudioUrl(audioId);
    if (!response.success || !response.audioUrl) return null;

    return {
      ...base,
      audioUrl: response.audioUrl,
      isLocalFile: false,
    };
  } catch (error) {
    console.error(`[audioMetadata] Failed to resolve "${naat.$id}"`, error);
    return null;
  }
}
