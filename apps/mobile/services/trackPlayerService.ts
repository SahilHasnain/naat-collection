/**
 * Track Player Service
 * Handles playback events for react-native-track-player
 */

import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
} from "@weights-ai/react-native-track-player";

export async function PlaybackService() {
  // Remote Play
  const handleRemotePlay = async () => {
    console.log("[TrackPlayer] RemotePlay event");
    try {
      await TrackPlayer.play();
    } catch (error) {
      console.error("[TrackPlayer] RemotePlay error:", error);
    }
  };

  // Remote Pause
  const handleRemotePause = async () => {
    console.log("[TrackPlayer] RemotePause event");
    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error("[TrackPlayer] RemotePause error:", error);
    }
  };

  // Register listeners using both enum and raw string event names
  // to be robust across platform/library differences.
  TrackPlayer.addEventListener(Event.RemotePlay, handleRemotePlay);
  TrackPlayer.addEventListener("remote-play" as any, handleRemotePlay);

  TrackPlayer.addEventListener(Event.RemotePause, handleRemotePause);
  TrackPlayer.addEventListener("remote-pause" as any, handleRemotePause);

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log("[TrackPlayer] RemoteStop event - pausing playback");
    // Don't reset - just pause so miniplayer stays visible
    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error("[TrackPlayer] RemoteStop error:", error);
    }
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
      // Which actions the player supports in general
      capabilities: [Capability.Play, Capability.Pause, Capability.SeekTo],
      // Which actions show specifically in the Android notification
      notificationCapabilities: [Capability.Play, Capability.Pause],
      // Which actions show in the compact notification form
      compactCapabilities: [Capability.Play, Capability.Pause],
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.PausePlayback,
      },
    });

    console.log("[TrackPlayer] Setup complete");
  } catch (error) {
    console.error("[TrackPlayer] Setup error:", error);
    throw error;
  }
}
