/**
 * For You Algorithm Service
 *
 * Personalized content discovery based on an on-device taste profile.
 * Scoring signals (weighted):
 * - Channel affinity: your engagement with channels (plays/completions/downloads)
 * - Topic affinity: title terms you have engaged with
 * - Recency: newer content prioritized (exponential decay)
 * - Unseen: content you haven't watched recently (recency-decayed)
 * - Channel diversity: mix different channels
 * - Random factor: keep it interesting (exploration)
 *
 * Explicit "Not for you" feedback excludes naats and heavily penalizes channels.
 * Cold start (few plays) naturally falls back to near-default behavior because
 * channel/topic affinity is neutral until the user builds a profile.
 */

import type { Naat } from "../types";
import { getPreferredDuration } from "@naat-collection/shared";
import { storageService } from "./storage";
import {
  COLD_START_PLAYS,
  DurationBucket,
  UserProfile,
  userProfileService,
} from "./userProfile";

interface ScoredNaat {
  naat: Naat;
  score: number;
}

/**
 * Algorithm weights for scoring
 */
const WEIGHTS = {
  AFFINITY: 0.28, // Your channel affinity
  TOPIC: 0.14, // Your title-topic affinity
  RECENCY: 0.15, // How new the content is
  DIVERSITY: 0.12, // Channel variety
  UNSEEN: 0.2, // Not watched recently (recency-decayed)
  DURATION: 0.08, // Your preferred length
  RANDOM: 0.03, // Random factor for discovery
};

/** How recently a watch still counts as "seen" (3 days). */
const SEEN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/** Weight penalty per dislike on a channel. */
const DISLIKED_CHANNEL_PENALTY = 0.15;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalize an affinity score to 0-1 using a sigmoid.
 * 0 affinity -> 0.5 (neutral).
 */
function normalizeAffinity(affinity: number): number {
  return 1 / (1 + Math.exp(-affinity / 2));
}

/**
 * Calculate recency score (0-1)
 * Newer content gets higher scores
 */
function calculateRecencyScore(uploadDate: string): number {
  const now = Date.now();
  const uploaded = new Date(uploadDate).getTime();
  const ageInDays = (now - uploaded) / (1000 * 60 * 60 * 24);

  // Exponential decay: content loses 50% score every 30 days
  return Math.exp(-ageInDays / 30);
}

/**
 * Calculate unseen score (0-1) with recency decay.
 * Never-watched items score 1; recently watched items score low and recover
 * over time so old history doesn't permanently hide content.
 */
function calculateUnseenScore(
  watchedAt: number | undefined,
): number {
  if (!watchedAt) return 1;
  const elapsed = Date.now() - watchedAt;
  return clamp(elapsed / SEEN_WINDOW_MS, 0, 1);
}

/**
 * Calculate topic affinity score (0-1)
 * Higher when the naat's title shares terms the user engaged with.
 */
function calculateTopicScore(title: string, topicTerms: Record<string, number>): number {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  let sum = 0;
  for (const word of words) {
    sum += topicTerms[word] || 0;
  }
  return clamp(sum / 2, 0, 1);
}

/**
 * Calculate diversity score (0-1)
 * Penalizes channels that appear too frequently in recent results
 */
function calculateDiversityScore(
  channelId: string,
  recentChannels: Map<string, number>
): number {
  const count = recentChannels.get(channelId) || 0;
  // Exponential penalty for repeated channels
  return Math.exp(-count / 3);
}

/**
 * Apply weighted shuffle to scored naats
 * Higher scored items are more likely to appear first
 */
function weightedShuffle(scoredNaats: ScoredNaat[]): Naat[] {
  const result: Naat[] = [];
  const remaining = [...scoredNaats];

  while (remaining.length > 0) {
    // Calculate total score
    const totalScore = remaining.reduce((sum, item) => sum + item.score, 0);

    // Pick random value
    let random = Math.random() * totalScore;

    // Select item based on weighted probability
    let selectedIndex = 0;
    for (let i = 0; i < remaining.length; i++) {
      random -= remaining[i].score;
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    // Add to result and remove from remaining
    result.push(remaining[selectedIndex].naat);
    remaining.splice(selectedIndex, 1);
  }

  return result;
}

/**
 * Generate For You feed with personalized scoring
 *
 * @param naats - All available naats
 * @param channelId - Optional channel filter
 * @param profile - Pre-loaded user profile (optional)
 * @returns Personalized ordered array of naats
 */
export async function generateForYouFeed(
  naats: Naat[],
  channelId?: string | null,
  profile?: UserProfile,
): Promise<Naat[]> {
  if (naats.length === 0) return [];

  const userProfile = profile || (await userProfileService.getProfile());

  // Exclude explicitly disliked naats
  const candidates = naats.filter(
    (n) => (userProfile.dislikedNaats[n.$id] || 0) === 0,
  );
  if (candidates.length === 0) return [];

  // Get watch history timestamps for recency-decayed "unseen"
  const watchTimestamps = await storageService.getWatchHistoryTimestamps();
  const maxViews = Math.max(...candidates.map((n) => n.views), 1);

  // Cold start: rely on engagement/recency more until the profile is meaningful
  const isColdStart = userProfile.totalPlays < COLD_START_PLAYS;
  const preferredDuration = userProfileService.getPreferredDuration(userProfile);

  // Track recent channels for diversity
  const recentChannels = new Map<string, number>();

  // Score each naat
  const scoredNaats: ScoredNaat[] = candidates.map((naat) => {
    // Channel affinity score (your taste)
    const affinity = userProfile.channelAffinity[naat.channelId] || 0;
    const affinityScore = normalizeAffinity(affinity);

    // Topic affinity score
    const topicScore = calculateTopicScore(naat.title, userProfile.topicTerms);

    // Recency score
    const recencyScore = calculateRecencyScore(naat.uploadDate);

    // Engagement score (fallback popularity for cold start / neutral affinity)
    const engagementScore = Math.min(naat.views / maxViews, 1);

    // Unseen score with recency decay
    const unseenScore = calculateUnseenScore(watchTimestamps[naat.$id]);

    // Diversity score
    const diversityScore = calculateDiversityScore(naat.channelId, recentChannels);

    // Duration preference score
    const naatDuration: DurationBucket =
      getPreferredDuration(naat) / 60 < 5
        ? "short"
        : getPreferredDuration(naat) / 60 <= 15
          ? "medium"
          : "long";
    const durationScore = preferredDuration === naatDuration ? 1 : 0.4;

    // Random factor
    const randomScore = Math.random();

    // Blend affinity: during cold start rely more on engagement so the feed
    // isn't empty/random before the user has built a taste profile
    const affinityBlend = isColdStart ? 0.4 : 1;
    const effectiveAffinity =
      affinityScore * affinityBlend + engagementScore * (1 - affinityBlend);

    // Calculate weighted total score
    let score =
      effectiveAffinity * WEIGHTS.AFFINITY +
      topicScore * WEIGHTS.TOPIC +
      recencyScore * WEIGHTS.RECENCY +
      diversityScore * WEIGHTS.DIVERSITY +
      unseenScore * WEIGHTS.UNSEEN +
      durationScore * WEIGHTS.DURATION +
      randomScore * WEIGHTS.RANDOM;

    // Strong penalty for channels the user has disliked repeatedly
    const dislikeCount = userProfile.dislikedChannels[naat.channelId] || 0;
    if (dislikeCount > 0) {
      score *= Math.pow(DISLIKED_CHANNEL_PENALTY, Math.min(dislikeCount, 3));
    }

    return { naat, score };
  });

  // Apply weighted shuffle
  return weightedShuffle(scoredNaats);
}

/**
 * Get For You feed with session caching
 * Returns cached order if session is still valid
 *
 * @param naats - All available naats
 * @param channelId - Optional channel filter
 * @returns Ordered array of naats
 */
export async function getForYouFeed(
  naats: Naat[],
  channelId?: string | null,
): Promise<Naat[]> {
  const profile = await userProfileService.getProfile();

  // Check for existing session
  const sessionIds = await storageService.getForYouSession();

  if (sessionIds) {
    // Reconstruct order from session
    const naatMap = new Map(naats.map((n) => [n.$id, n]));
    const orderedNaats = sessionIds
      .map((id) => naatMap.get(id))
      .filter((n): n is Naat => n !== undefined)
      // Keep session fresh w.r.t. dislikes
      .filter((n) => (profile.dislikedNaats[n.$id] || 0) === 0);

    // If we have most of the naats, use cached order
    if (orderedNaats.length >= naats.length * 0.8) {
      return orderedNaats;
    }
  }

  // Generate new order
  const orderedNaats = await generateForYouFeed(naats, channelId, profile);

  // Save session
  await storageService.saveForYouSession(orderedNaats.map((n) => n.$id));

  return orderedNaats;
}
