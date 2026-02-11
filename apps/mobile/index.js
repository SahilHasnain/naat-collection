import "expo-router/entry";

// Register the playback service - deferred to avoid build-time import issues
if (typeof require !== "undefined") {
  try {
    const TrackPlayer = require("react-native-track-player").default;
    const { playbackService } = require("./services/trackPlayerService");
    TrackPlayer.registerPlaybackService(() => playbackService);
  } catch (error) {
    console.log(
      "[TrackPlayer] Not available yet, will be registered after build:",
      error.message,
    );
  }
}
