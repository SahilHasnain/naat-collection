import { colors } from "@/constants/theme";
import { DownloadedAudioModalProps } from "@/types";
import { showErrorToast } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import AudioPlayer from "./AudioPlayer";

const DownloadedAudioModal: React.FC<DownloadedAudioModalProps> = ({
  visible,
  onClose,
  audio,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Generate thumbnail URL from YouTube ID
  const thumbnailUrl = `https://img.youtube.com/vi/${audio.youtubeId}/maxresdefault.jpg`;

  // Handle audio player errors
  const handleError = (err: Error) => {
    console.error("[DownloadedAudioModal] Audio error:", err);
    setError(err);
    setIsLoading(false);
    showErrorToast("Unable to play audio file");
  };

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setError(null);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <SafeAreaView className="flex-1 bg-black">
        {/* Header with Close Button */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-800">
          <Text className="text-lg font-bold text-white">Now Playing</Text>
          <Pressable
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-neutral-800"
            accessibilityRole="button"
            accessibilityLabel="Close player"
            accessibilityHint="Double tap to close the audio player"
          >
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
        </View>

        {/* Audio Player or Loading/Error State */}
        {isLoading && !error ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text className="mt-4 text-white">Loading audio...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons
              name="alert-circle"
              size={64}
              color={colors.accent.error}
            />
            <Text className="mt-4 text-center text-xl font-bold text-white">
              Playback Error
            </Text>
            <Text className="mt-2 text-center text-base text-neutral-400">
              {error.message ||
                "Unable to play this audio file. It may be corrupted or deleted."}
            </Text>
            <Pressable
              onPress={onClose}
              className="mt-6 px-6 py-3 rounded-lg bg-neutral-800"
              accessibilityRole="button"
              accessibilityLabel="Close error dialog"
            >
              <Text className="text-white font-semibold">Close</Text>
            </Pressable>
          </View>
        ) : (
          <AudioPlayer
            audioUrl={audio.localUri}
            title={audio.title}
            channelName="Downloaded Audio"
            thumbnailUrl={thumbnailUrl}
            onError={handleError}
            autoPlay={true}
            isLocalFile={true}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default DownloadedAudioModal;
