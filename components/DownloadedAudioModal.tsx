import { AudioMetadata, useAudioPlayer } from "@/contexts/AudioContext";
import { DownloadedAudioModalProps } from "@/types";
import React, { useEffect } from "react";

const DownloadedAudioModal: React.FC<DownloadedAudioModalProps> = ({
  visible,
  onClose,
  audio,
}) => {
  const { loadAndPlay } = useAudioPlayer();

  // When modal becomes visible, load and play the audio via AudioContext
  useEffect(() => {
    if (visible && audio) {
      const loadAudio = async () => {
        // Generate thumbnail URL from YouTube ID
        const thumbnailUrl = `https://img.youtube.com/vi/${audio.youtubeId}/maxresdefault.jpg`;

        const audioMetadata: AudioMetadata = {
          audioUrl: audio.localUri,
          title: audio.title,
          channelName: "Downloaded Audio",
          thumbnailUrl,
          isLocalFile: true,
          audioId: audio.audioId,
          youtubeId: audio.youtubeId,
        };

        await loadAndPlay(audioMetadata);

        // Close modal immediately - audio will play via MiniPlayer
        onClose();
      };

      loadAudio();
    }
  }, [visible, audio, loadAndPlay, onClose]);

  // This component doesn't render anything - it just triggers audio playback
  return null;
};

export default DownloadedAudioModal;
