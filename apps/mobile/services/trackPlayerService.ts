// Dynamic import to avoid build-time errors
let TrackPlayer: any = null;
let AppKilledPlaybackBehavior: any = null;
let Capability: any = null;

try {
  const trackPlayerModule = require("react-native-track-player");
  TrackPlayer = trackPlayerModule.default;
  AppKilledPlaybackBehavior = trackPlayerModule.AppKilledPlaybackBehavior;
  Capability = trackPlayerModule.Capability;
} catch (error) {
  console.log("[TrackPlayer] Module not available yet");
}

export async function setupPlayer() {
  if (!TrackPlayer) {
    console.log("[TrackPlayer] Not available, skipping setup");
    return false;
  }

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
  if (!TrackPlayer) return;

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
  if (!TrackPlayer) return;

  TrackPlayer.addEventListener("remote-play", () => TrackPlayer.play());
  TrackPlayer.addEventListener("remote-pause", () => TrackPlayer.pause());
  TrackPlayer.addEventListener("remote-stop", () => TrackPlayer.stop());
  TrackPlayer.addEventListener("remote-next", () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener("remote-previous", () =>
    TrackPlayer.skipToPrevious(),
  );
  TrackPlayer.addEventListener("remote-seek", (event: any) =>
    TrackPlayer.seekTo(event.position),
  );
}

export async function updateOptions() {
  if (!TrackPlayer || !AppKilledPlaybackBehavior || !Capability) return;

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
