/**
 * Live Radio Types
 *
 * Types for the 24/7 live naat radio feature
 */

export interface LiveRadioState {
  $id: string;
  currentNaatId: string;
  startedAt: string; // ISO timestamp when current naat started
  playlist: string[]; // Array of next naat IDs
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
  startPosition: number; // Milliseconds into the current naat
  listenerCount?: number;
}

export interface LiveRadioService {
  getCurrentState: () => Promise<LiveRadioState | null>;
  subscribeToChanges: (callback: (state: LiveRadioState) => void) => () => void;
  getListenerCount: () => Promise<number>;
}
