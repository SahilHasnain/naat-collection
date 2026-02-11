import "expo-router/entry";
import TrackPlayer from "react-native-track-player";
import { playbackService } from "./services/trackPlayerService";

// Register the playback service
TrackPlayer.registerPlaybackService(() => playbackService);
