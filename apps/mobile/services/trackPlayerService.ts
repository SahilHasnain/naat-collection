import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from "react-native-track-player";

export async function setupPlayer() {
  let isSetup = false;
  try {
    await TrackPlayer.getActiveTrackIndex();
    isSetup = true;
  } catch {
    await TrackPlayer.setupPlayer();
    isSetup = true;
  } finally {
    return isSetup;
  }
}

export async function addTrack() {
  await TrackPlayer.add([
    {
      id: "1",
      url: "https://example.com/audio.mp3",
      title: "Track Title",
      artist: "Track Artist",
      artwork: "https://example.com/artwork.jpg",
    },
  ]);
}

export async function playbackService() {
  TrackPlayer.addEventListener("remote-play", () => TrackPlayer.play());
  TrackPlayer.addEventListener("remote-pause", () => TrackPlayer.pause());
  TrackPlayer.addEventListener("remote-stop", () => TrackPlayer.stop());
  TrackPlayer.addEventListener("remote-next", () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener("remote-previous", () =>
    TrackPlayer.skipToPrevious(),
  );
  TrackPlayer.addEventListener("remote-seek", (event) =>
    TrackPlayer.seekTo(event.position),
  );
}

export async function updateOptions() {
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior:
        AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
    ],
    progressUpdateEventInterval: 1,
  });
}
