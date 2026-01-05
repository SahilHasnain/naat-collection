import { VideoPlayerProps } from "@/types";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  initialPosition = 0,
  onPositionChange,
  onComplete,
  onError,
}) => {
  const videoRef = React.useRef<Video>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    if (initialPosition > 0 && videoRef.current) {
      videoRef.current.setPositionAsync(initialPosition * 1000);
    }
  }, [initialPosition]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        const errorMessage = `Video failed to load: ${status.error}`;
        setError(errorMessage);
        onError(new Error(errorMessage));
      }
      return;
    }

    setIsLoading(false);
    setIsPlaying(status.isPlaying);

    // Save position every second
    if (status.positionMillis && status.positionMillis > 0) {
      const positionInSeconds = Math.floor(status.positionMillis / 1000);
      onPositionChange(positionInSeconds);
    }

    // Check if video completed
    if (status.didJustFinish) {
      onComplete();
    }
  };

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (err) {
      const errorMessage = "Failed to control playback";
      setError(errorMessage);
      onError(new Error(errorMessage));
    }
  };

  const handleFullscreen = async () => {
    if (!videoRef.current) return;

    try {
      if (isFullscreen) {
        await videoRef.current.dismissFullscreenPlayer();
      } else {
        await videoRef.current.presentFullscreenPlayer();
      }
      setIsFullscreen(!isFullscreen);
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  };

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-black p-8">
        <Text className="text-5xl mb-6">⚠️</Text>
        <Text className="mb-6 text-center text-lg leading-relaxed text-white">
          {error}
        </Text>
        <Pressable
          onPress={() => {
            setError(null);
            setIsLoading(true);
          }}
          className="rounded-xl bg-primary-600 px-8 py-4 active:bg-primary-700"
        >
          <Text className="text-base font-bold text-white">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="relative flex-1 bg-black">
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={{ flex: 1 }}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={() => {
          const errorMessage = "Unable to play video. Please try another naat.";
          setError(errorMessage);
          onError(new Error(errorMessage));
        }}
      />

      {isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-black/70">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="mt-4 text-base text-white">Loading video...</Text>
        </View>
      )}

      {!isLoading && (
        <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
          <View className="flex-row items-center justify-center gap-6">
            <Pressable
              onPress={handlePlayPause}
              className="rounded-full bg-white/25 backdrop-blur-sm px-10 py-5 active:bg-white/35"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
              accessibilityLabel={isPlaying ? "Pause" : "Play"}
              accessibilityRole="button"
            >
              <Text className="text-2xl font-bold text-white">
                {isPlaying ? "⏸" : "▶"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleFullscreen}
              className="rounded-full bg-white/25 backdrop-blur-sm px-6 py-5 active:bg-white/35"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
              accessibilityLabel="Toggle fullscreen"
              accessibilityRole="button"
            >
              <Text className="text-xl text-white">
                {isFullscreen ? "⊡" : "⛶"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

export default VideoPlayer;
