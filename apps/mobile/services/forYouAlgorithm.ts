/**
 * For You Algorithm Service
 *
 * Smart content discovery algorithm that provides personalized,
 * randomized content recommendations based on:
 * - Watch history (avoid recently watched)
 * - Recency (newer content prioritized)
 * - Engagement (views count)
 * - Channel diversity (mix different channels)
 * - Random factor (keep it interesting)
 */

import type { NaatMetadata } from "@naat-collection/shared";
import { storageService } from "./storage";

interface ScoredNaat {
  naat: NaatMetadata;
  score: number;
}

/**
 * Algorithm weights for scoring
 */
const WEIGHTS = {
  RECENCY: 0.25,
  ENGAGEMENT: 0.3,
  DIVERSITY: 0.2,
  UNSEEN: 0.15,
  RANDOM: 0.1,
};

function calculateRecencyScore(uploadDate: string): number {
  const now = Date.now();
  const uploaded = new Date(uploadDate).getTime();
  const ageInDays = (now - uploaded) / (1000 * 60 * 60 * 24);
  return Math.exp(-ageInDays / 30);
}

function calculateEngagementScore(views: number, maxViews: number): number {
  if (maxViews === 0) return 0;
  return Math.min(views / maxViews, 1);
}

function calculateDiversityScore(
  channelId: string,
  recentChannels: Map<string, number>,
): number {
  const count = recentChannels.get(channelId) || 0;
  return Math.exp(-count / 3);
}

function weightedShuffle(scoredNaats: ScoredNaat[]): NaatMetadata[] {
  const result: NaatMetadata[] = [];
  const remaining = [...scoredNaats];

  while (remaining.length > 0) {
    const totalScore = remaining.reduce((sum, item) => sum + item.score, 0);
    let random = Math.random() * totalScore;

    let selectedIndex = 0;
    for (let i = 0; i < remaining.length; i++) {
      random -= remaining[i].score;
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    result.push(remaining[selectedIndex].naat);
    remaining.splice(selectedIndex, 1);
  }

  return result;
}

/**
 * Generate For You feed with smart randomization using lightweight metadata
 */
export async function generateForYouFeed(
  naats: NaatMetadata[],
  channelId?: string | null,
): Promise<NaatMetadata[]> {
  const filteredNaats = channelId
    ? naats.filter((naat) => naat.channelId === channelId)
    : naats;

  if (filteredNaats.length === 0) return [];

  const watchHistory = await storageService.getWatchHistory();
  const watchedSet = new Set(watchHistory);
  const maxViews = Math.max(...filteredNaats.map((n) => n.views), 1);
  const recentChannels = new Map<string, number>();

  const scoredNaats: ScoredNaat[] = filteredNaats.map((naat) => {
    const recencyScore = calculateRecencyScore(naat.uploadDate);
    const engagementScore = calculateEngagementScore(naat.views, maxViews);
    const diversityScore = calculateDiversityScore(
      naat.channelId,
      recentChannels,
    );
    const unseenScore = watchedSet.has(naat.id) ? 0 : 1;
    const randomScore = Math.random();

    const score =
      recencyScore * WEIGHTS.RECENCY +
      engagementScore * WEIGHTS.ENGAGEMENT +
      diversityScore * WEIGHTS.DIVERSITY +
      unseenScore * WEIGHTS.UNSEEN +
      randomScore * WEIGHTS.RANDOM;

    return { naat, score };
  });

  return weightedShuffle(scoredNaats);
}

/**
 * Get For You feed with session caching
 */
export async function getForYouFeed(
  naats: NaatMetadata[],
  channelId?: string | null,
): Promise<NaatMetadata[]> {
  const filteredNaats = channelId
    ? naats.filter((naat) => naat.channelId === channelId)
    : naats;

  const sessionIds = await storageService.getForYouSession();

  if (sessionIds) {
    const naatMap = new Map(filteredNaats.map((n) => [n.id, n]));
    const orderedNaats = sessionIds
      .map((id) => naatMap.get(id))
      .filter((n): n is NaatMetadata => n !== undefined);

    if (orderedNaats.length >= filteredNaats.length * 0.8) {
      return orderedNaats;
    }
  }

  const orderedNaats = await generateForYouFeed(filteredNaats, channelId);
  await storageService.saveForYouSession(orderedNaats.map((n) => n.id));

  return orderedNaats;
}
