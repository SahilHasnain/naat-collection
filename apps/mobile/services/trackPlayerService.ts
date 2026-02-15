/**
 * Track Player Service
 * Handles playback events for react-native-track-player
 */

import TrackPlayer, {
  Capability,
  Event,
} from "@weights-ai/react-native-track-player";

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log("[TrackPlayer] RemoteStop event - pausing playback");
    // Don't reset - just pause so miniplayer stays visible
    await TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    // Handle next track if needed
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    // Handle previous track if needed
  });
}

/**
 * Setup Track Player with default configuration
 */
export async function setupPlayer() {
  try {
    await TrackPlayer.setupPlayer({
      waitForBuffer: true,
      autoUpdateMetadata: true,
      autoHandleInterruptions: true,
    });

    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause],
    });

    console.log("[TrackPlayer] Setup complete");
  } catch (error) {
    console.error("[TrackPlayer] Setup error:", error);
    throw error;
  }
}
