import { registerRootComponent } from "expo";
import TrackPlayer from "react-native-track-player";

import App from "./App";

// Service Handler
TrackPlayer.registerPlaybackService(
  () => require("./services/trackPlayerService").playbackService,
);

registerRootComponent(App);
