import { colors } from "@/constants/theme";
import { VideoPlayerProps } from "@/types";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  const [isLoading, setIsLoading] = React.useState(true);

  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string): string => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : "";
  };

  const videoId = getYouTubeId(videoUrl);

  return (
    <View className="relative flex-1 bg-black">
      <View style={{ flex: 1, justifyContent: "center" }}>
        <YoutubePlayer
          height={400}
          videoId={videoId}
          play={false}
          onReady={() => setIsLoading(false)}
          onError={(error: string) => {
            setIsLoading(false);
            Alert.alert(
              "Video Error",
              "Unable to load video. Please check your internet connection and try again.",
              [{ text: "OK" }]
            );
          }}
          webViewStyle={{ opacity: isLoading ? 0 : 1 }}
          initialPlayerParams={{
            controls: true,
            modestbranding: true,
            rel: false,
          }}
        />
      </View>

      {isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-black">
          <ActivityIndicator size="large" color={colors.text.primary} />
        </View>
      )}
    </View>
  );
};

export default VideoPlayer;
