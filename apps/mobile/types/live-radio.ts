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
