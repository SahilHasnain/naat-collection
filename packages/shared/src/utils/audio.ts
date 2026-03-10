import { Naat } from "../types";

/**
 * Get the preferred audio ID for a naat
 * Prioritizes cutAudio (processed/cut version) over audioId (original)
 */
export function getPreferredAudioId(naat: Naat): string | undefined {
  return naat.cutAudio || naat.audioId;
}

/**
 * Check if a naat has any audio available
 */
export function hasAudio(naat: Naat): boolean {
  return !!(naat.cutAudio || naat.audioId);
}

/**
 * Check if a naat has cut/processed audio
 */
export function hasCutAudio(naat: Naat): boolean {
  return !!naat.cutAudio;
}

/**
 * Get the preferred duration for a naat
 * Prioritizes cutDuration (after cutting) over duration (original)
 */
export function getPreferredDuration(naat: Naat): number {
  return naat.cutDuration || naat.duration;
}

