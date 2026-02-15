/**
 * Track Player Service
 * Handles playback events for react-native-track-player
 */

import TrackPlayer, { Event } from "@weights-ai/react-native-track-player";

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
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
        TrackPlayer.CAPABILITY_PLAY,
        TrackPlayer.CAPABILITY_PAUSE,
        TrackPlayer.CAPABILITY_STOP,
        TrackPlayer.CAPABILITY_SEEK_TO,
      ],
      compactCapabilities: [
        TrackPlayer.CAPABILITY_PLAY,
        TrackPlayer.CAPABILITY_PAUSE,
      ],
    });

    console.log("[TrackPlayer] Setup complete");
  } catch (error) {
    console.error("[TrackPlayer] Setup error:", error);
    throw error;
  }
}
