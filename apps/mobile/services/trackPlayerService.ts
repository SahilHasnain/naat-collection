/**
 * Track Player Service
 * Handles playback events for react-native-track-player
 */

import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
} from "@weights-ai/react-native-track-player";

const SEEK_INTERVAL = 15; // seconds

export async function PlaybackService() {
  // Simple, synchronous event handlers
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    // Handle next track if needed
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    // Handle previous track if needed
  });

  // Jump forward handler
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    await TrackPlayer.seekBy(event.interval || SEEK_INTERVAL);
  });

  // Jump backward handler
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    await TrackPlayer.seekBy(-(event.interval || SEEK_INTERVAL));
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
      // Only include capabilities you actually want
      capabilities: [Capability.Play, Capability.Pause],
      notificationCapabilities: [Capability.Play, Capability.Pause],
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

/**
 * Update notification capabilities based on playback mode
 * @param isLiveMode - Whether live radio mode is active
 */
export async function updateNotificationCapabilities(isLiveMode: boolean) {
  try {
    if (isLiveMode) {
      // Live mode: only play/pause
      await TrackPlayer.updateOptions({
        capabilities: [Capability.Play, Capability.Pause],
        notificationCapabilities: [Capability.Play, Capability.Pause],
        compactCapabilities: [Capability.Play, Capability.Pause],
      });
      console.log("[TrackPlayer] Updated to live mode capabilities");
    } else {
      // Normal mode: play/pause + jump forward/backward
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.JumpForward,
          Capability.JumpBackward,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.JumpForward,
          Capability.JumpBackward,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
        forwardJumpInterval: SEEK_INTERVAL,
        backwardJumpInterval: SEEK_INTERVAL,
      });
      console.log(
        "[TrackPlayer] Updated to normal mode capabilities with seek",
      );
    }
  } catch (error) {
    console.error("[TrackPlayer] Error updating capabilities:", error);
  }
}
