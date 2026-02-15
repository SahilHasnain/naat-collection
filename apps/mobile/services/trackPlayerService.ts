import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
} from "@weights-ai/react-native-track-player";

/**
 * Track Player Service
 * Handles background playback events
 */
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) =>
    TrackPlayer.seekTo(position),
  );
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
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SeekTo,
        Capability.Skip,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
      ],
    });

    console.log("[TrackPlayer] Setup complete");
  } catch (error) {
    console.error("[TrackPlayer] Setup error:", error);
    throw error;
  }
}
