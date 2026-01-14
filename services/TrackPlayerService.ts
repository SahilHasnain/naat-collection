/**
 * Track Player Service
 * Handles initialization and configuration of react-native-track-player
 */

import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
} from "react-native-track-player";

/**
 * Initialize Track Player
 * Must be called before using any track player functionality
 */
export async function setupTrackPlayer() {
  let isSetup = false;

  try {
    // Check if already initialized
    await TrackPlayer.getActiveTrack();
    isSetup = true;
    console.log("[TrackPlayer] Already initialized");
  } catch {
    // Not initialized, set it up
    try {
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true,
      });
      isSetup = true;
      console.log("[TrackPlayer] Initialized successfully");
    } catch (error) {
      console.error("[TrackPlayer] Setup failed:", error);
      isSetup = false;
    }
  }

  if (isSetup) {
    // Configure capabilities (what controls are available)
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause],
      progressUpdateEventInterval: 1, // Update position every 1 second
    });

    console.log("[TrackPlayer] Options configured");
  }

  return isSetup;
}

/**
 * Reset Track Player
 * Clears queue and stops playback
 */
export async function resetTrackPlayer() {
  try {
    await TrackPlayer.reset();
    console.log("[TrackPlayer] Reset successfully");
  } catch (error) {
    console.error("[TrackPlayer] Reset failed:", error);
  }
}

/**
 * Set repeat mode
 */
export async function setRepeatMode(enabled: boolean) {
  try {
    await TrackPlayer.setRepeatMode(
      enabled ? RepeatMode.Track : RepeatMode.Off
    );
    console.log("[TrackPlayer] Repeat mode:", enabled);
  } catch (error) {
    console.error("[TrackPlayer] Set repeat mode failed:", error);
  }
}
