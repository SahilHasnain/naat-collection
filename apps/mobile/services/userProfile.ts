import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPreferredDuration } from "@naat-collection/shared";
import type { Naat } from "../types";

/**
 * Persistent user taste profile for the For You feed.
 *
 * Signals:
 * - Channel affinity: updated on play/completion/download (positive) and
 *   "Not for you" (negative).
 * - Disliked naats & channels: from explicit "Not for you" feedback.
 * - Topic terms: tokenized from titles of naats the user engaged with.
 *
 * Data is stored locally only (no backend round-trips).
 */

export type DurationBucket = "short" | "medium" | "long";

export interface UserProfile {
  channelAffinity: Record<string, number>;
  dislikedNaats: Record<string, number>;
  dislikedChannels: Record<string, number>;
  topicTerms: Record<string, number>;
  durationCounts: Record<DurationBucket, number>;
  totalPlays: number;
  lastUpdated: number;
}

const PROFILE_KEY = "@naat_user_profile";
const PROFILE_VERSION = 1;

/** Play counts below this threshold are treated as cold start. */
export const COLD_START_PLAYS = 10;

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "by",
  "at",
  "naat",
  "naats",
  "kalam",
  "new",
  "best",
  "full",
  "official",
]);

const DEFAULT_PROFILE: UserProfile = {
  channelAffinity: {},
  dislikedNaats: {},
  dislikedChannels: {},
  topicTerms: {},
  durationCounts: { short: 0, medium: 0, long: 0 },
  totalPlays: 0,
  lastUpdated: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function tokenizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function durationBucket(seconds: number): DurationBucket {
  const minutes = seconds / 60;
  if (minutes < 5) return "short";
  if (minutes <= 15) return "medium";
  return "long";
}

export class UserProfileService {
  /**
   * Load the current profile from storage.
   * @returns The stored profile, or a fresh default if none exists.
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (!raw) return { ...DEFAULT_PROFILE };

      const parsed = JSON.parse(raw);
      if (parsed.version !== PROFILE_VERSION) return { ...DEFAULT_PROFILE };

      return {
        channelAffinity: parsed.channelAffinity || {},
        dislikedNaats: parsed.dislikedNaats || {},
        dislikedChannels: parsed.dislikedChannels || {},
        topicTerms: parsed.topicTerms || {},
        durationCounts: parsed.durationCounts || {
          short: 0,
          medium: 0,
          long: 0,
        },
        totalPlays: parsed.totalPlays || 0,
        lastUpdated: parsed.lastUpdated || 0,
      };
    } catch (error) {
      console.error("[UserProfile] Failed to load profile:", error);
      return { ...DEFAULT_PROFILE };
    }
  }

  /**
   * Persist a profile update. Non-critical — never throws.
   */
  private async saveProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ ...profile, version: PROFILE_VERSION }),
      );
    } catch (error) {
      console.error("[UserProfile] Failed to save profile:", error);
    }
  }

  /**
   * Record a playback start (partial engagement).
   * Adds a modest positive signal for the channel and title terms.
   */
  async recordPlay(naat: Naat): Promise<void> {
    const profile = await this.getProfile();

    profile.channelAffinity[naat.channelId] = clamp(
      (profile.channelAffinity[naat.channelId] || 0) + 0.3,
      -5,
      10,
    );
    profile.totalPlays += 1;
    profile.durationCounts[durationBucket(getPreferredDuration(naat))] += 1;
    profile.lastUpdated = Date.now();

    for (const term of tokenizeTitle(naat.title)) {
      profile.topicTerms[term] = (profile.topicTerms[term] || 0) + 0.3;
    }

    await this.saveProfile(profile);
  }

  /**
   * Record a completed playback (strong positive signal).
   */
  async recordCompletion(naat: Naat): Promise<void> {
    const profile = await this.getProfile();

    profile.channelAffinity[naat.channelId] = clamp(
      (profile.channelAffinity[naat.channelId] || 0) + 0.5,
      -5,
      10,
    );
    profile.durationCounts[durationBucket(getPreferredDuration(naat))] += 1;
    profile.lastUpdated = Date.now();

    for (const term of tokenizeTitle(naat.title)) {
      profile.topicTerms[term] = (profile.topicTerms[term] || 0) + 0.5;
    }

    await this.saveProfile(profile);
  }

  /**
   * Record a re-listen (boost for repeated engagement).
   */
  async recordRelisten(naat: Naat): Promise<void> {
    const profile = await this.getProfile();

    profile.channelAffinity[naat.channelId] = clamp(
      (profile.channelAffinity[naat.channelId] || 0) + 0.8,
      -5,
      10,
    );
    profile.lastUpdated = Date.now();

    await this.saveProfile(profile);
  }

  /**
   * Record a download (strongest positive signal).
   */
  async recordDownload(naat: Naat): Promise<void> {
    const profile = await this.getProfile();

    profile.channelAffinity[naat.channelId] = clamp(
      (profile.channelAffinity[naat.channelId] || 0) + 1.0,
      -5,
      10,
    );
    profile.lastUpdated = Date.now();

    for (const term of tokenizeTitle(naat.title)) {
      profile.topicTerms[term] = (profile.topicTerms[term] || 0) + 1.0;
    }

    await this.saveProfile(profile);
  }

  /**
   * Record explicit "Not for you" feedback.
   * Adds a strong negative signal and marks the naat as disliked.
   */
  async recordNotForYou(naat: Naat): Promise<void> {
    const profile = await this.getProfile();

    profile.dislikedNaats[naat.$id] = (profile.dislikedNaats[naat.$id] || 0) + 1;
    profile.dislikedChannels[naat.channelId] =
      (profile.dislikedChannels[naat.channelId] || 0) + 1;
    profile.channelAffinity[naat.channelId] = clamp(
      (profile.channelAffinity[naat.channelId] || 0) - 1.0,
      -5,
      10,
    );
    profile.lastUpdated = Date.now();

    await this.saveProfile(profile);
  }

  /**
   * Check whether a naat has been explicitly disliked.
   */
  isDisliked(naat: Naat, profile: UserProfile): boolean {
    return (profile.dislikedNaats[naat.$id] || 0) > 0;
  }

  /**
   * Infer the user's preferred duration bucket from engagement counts.
   * Returns null until enough data accumulates.
   */
  getPreferredDuration(profile: UserProfile): DurationBucket | null {
    const { short, medium, long } = profile.durationCounts;
    const total = short + medium + long;
    if (total < 3) return null;

    const buckets: DurationBucket[] = ["short", "medium", "long"];
    let best: DurationBucket | null = null;
    let bestCount = 0;
    for (const bucket of buckets) {
      if (profile.durationCounts[bucket] > bestCount) {
        best = bucket;
        bestCount = profile.durationCounts[bucket];
      }
    }
    return best;
  }

  /**
   * Reset the profile (e.g. for testing or a "reset recommendations" action).
   */
  async clearProfile(): Promise<void> {
    await this.saveProfile({ ...DEFAULT_PROFILE });
  }
}

// Singleton instance
export const userProfileService = new UserProfileService();

export { durationBucket };
