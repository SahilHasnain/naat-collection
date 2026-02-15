import TrackPlayer from "@weights-ai/react-native-track-player";
import { PlaybackService } from "./services/trackPlayerService";

// Register the playback service before app loads
TrackPlayer.registerPlaybackService(() => PlaybackService);

// Import expo-router entry
import "expo-router/entry";
