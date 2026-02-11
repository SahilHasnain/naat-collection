/**
 * Live Radio Types
 *
 * Simplified radio with shared playlist approach
 */

export interface LiveRadioState {
  $id: string;
  currentTrackIndex: number; // Current position in playlist
  playlist: string[]; // Fixed rotating playlist of naat IDs
  updatedAt: string;
}

export interface LiveRadioMetadata {
  isLive: true;
  currentNaat: {
    id: string;
    title: string;
    channelName: string;
    thumbnailUrl: string;
    duration: number;
    audioUrl: string;
    youtubeId?: string;
  } | null;
  listenerCount?: number;
}

export interface LiveRadioService {
  getCurrentState: () => Promise<LiveRadioState | null>;
  subscribeToChanges: (callback: (state: LiveRadioState) => void) => () => void;
  getListenerCount: () => Promise<number>;
}
