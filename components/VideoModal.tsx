import { VideoPlayerProps } from "@/types";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

interface VideoModalProps extends VideoPlayerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  reciterName?: string;
}

const VideoModal: React.FC<VideoModalProps> = ({
  visible,
  onClose,
  videoUrl,
  title,
  reciterName,
}) => {
  const [isLoading, setIsLoading] = React.useState(true);

  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string): string => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : "";
  };

  const videoId = getYouTubeId(videoUrl);

  // Reset loading state when modal opens
  React.useEffect(() => {
    if (visible) {
      setIsLoading(true);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />

      {/* Backdrop */}
      <Pressable
        className="flex-1 bg-black/95"
        onPress={onClose}
        activeOpacity={1}
      >
        {/* Modal Content */}
        <View className="flex-1 justify-center px-4">
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-neutral-900 rounded-2xl overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            {/* Header */}
            <View className="bg-neutral-800 px-5 py-4 border-b border-neutral-700">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  {title && (
                    <Text
                      className="text-base font-bold text-white leading-tight"
                      numberOfLines={2}
                    >
                      {title}
                    </Text>
                  )}
                  {reciterName && (
                    <Text className="text-sm text-neutral-400 mt-1">
                      {reciterName}
                    </Text>
                  )}
                </View>

                <Pressable
                  onPress={onClose}
                  className="rounded-full bg-neutral-700 p-2 active:bg-neutral-600"
                  accessibilityLabel="Close video"
                  accessibilityRole="button"
                >
                  <Text className="text-xl text-white font-bold">✕</Text>
                </Pressable>
              </View>
            </View>

            {/* Video Player */}
            <View className="relative bg-black" style={{ height: 250 }}>
              <YoutubePlayer
                height={250}
                videoId={videoId}
                play={false}
                onReady={() => setIsLoading(false)}
                webViewStyle={{ opacity: isLoading ? 0 : 1 }}
                initialPlayerParams={{
                  controls: true,
                  modestbranding: true,
                  rel: false,
                }}
              />

              {isLoading && (
                <View className="absolute inset-0 items-center justify-center bg-black">
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text className="mt-3 text-sm text-neutral-400">
                    Loading video...
                  </Text>
                </View>
              )}
            </View>
          </Pressable>

          {/* Close hint */}
          <Text className="text-center text-sm text-neutral-500 mt-6">
            Tap outside to close
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
};

export default VideoModal;
