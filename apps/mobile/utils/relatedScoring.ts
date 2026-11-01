/**
 * Related-content ranking for video mode.
 *
 * All channels in a brand belong to the same artist/label, so channel signals
 * are intentionally ignored. Relevance is derived from title/topic similarity,
 * popularity, recency, watch history and the on-device taste profile.
 */

import type { UserProfile } from "@/services/userProfile";
import type { Naat } from "@/types";
import { getPreferredDuration } from "@naat-collection/shared";
import { userProfileService } from "@/services/userProfile";

/** Structural/English stopwords plus metadata noise common in naat titles. */
const NOISE_WORDS = new Set([
  // English function words
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "by",
  "at",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "as",
  "its",
  // Roman-Urdu particles that carry no topic meaning
  "ke",
  "ki",
  "ka",
  "ko",
  "se",
  "mein",
  "me",
  "hai",
  "hain",
  "ho",
  "aur",
  "ya",
  "par",
  "pe",
  "jo",
  "wo",
  "ye",
  "yeh",
  "bhi",
  "nahi",
  "kya",
  "liye",
  // Genre words (everything in this app is a naat)
  "naat",
  "naats",
  "naatain",
  "kalam",
  "salam",
  "hamd",
  "manqabat",
  "nasheed",
  // Upload metadata noise
  "official",
  "video",
  "videos",
  "vedio",
  "lyrics",
  "lyrical",
  "full",
  "hd",
  "4k",
  "new",
  "latest",
  "status",
  "whatsapp",
  "audio",
  "song",
  "songs",
  "live",
  "cover",
  "remix",
  "original",
  "version",
  "feat",
  "ft",
  "music",
  "slowed",
  "reverb",
  "whatsappstatus",
  "trending",
]);

/** Score weights (sum = 1) */
export const RELATED_WEIGHTS = {
  TITLE: 0.44, // Title/topic similarity with the current naat
  TOPIC: 0.14, // Taste profile's topic affinity
  POPULARITY: 0.14, // Views (log-scaled)
  RECENCY: 0.1, // Newer uploads first
  UNSEEN: 0.1, // Favor not-recently-watched
  DURATION: 0.04, // User's preferred length
  JITTER: 0.04, // Stable per-item jitter to break ties
} as const;

const SEEN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Tokenize a title into meaningful lowercase terms.
 */
export function tokenizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !NOISE_WORDS.has(word));
}

/**
 * Cosine similarity between the token sets of two titles (0-1).
 */
export function titleSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenizeTitle(a));
  const tokensB = new Set(tokenizeTitle(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  return intersection / Math.sqrt(tokensA.size * tokensB.size);
}

function topicAffinity(
  tokens: string[],
  topicTerms: Record<string, number>,
): number {
  let sum = 0;
  for (const token of tokens) {
    sum += topicTerms[token] || 0;
  }
  return clamp(sum / 2, 0, 1);
}

function recencyScore(uploadDate: string): number {
  const uploaded = new Date(uploadDate).getTime();
  if (!Number.isFinite(uploaded)) return 0.5;
  const ageInDays = Math.max(
    0,
    (Date.now() - uploaded) / (1000 * 60 * 60 * 24),
  );
  return Math.exp(-ageInDays / 30);
}

function unseenScore(watchedAt: number | undefined): number {
  if (!watchedAt) return 1;
  return clamp((Date.now() - watchedAt) / SEEN_WINDOW_MS, 0, 1);
}

function durationBucket(seconds: number): "short" | "medium" | "long" {
  const minutes = seconds / 60;
  if (minutes < 5) return "short";
  if (minutes <= 15) return "medium";
  return "long";
}

/** Deterministic 0-1 jitter derived from an id, so ordering is stable. */
function stableJitter(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

/** Dedupe key: sorted meaningful tokens, so reuploads collapse together. */
function titleKey(title: string): string {
  return tokenizeTitle(title).sort().join(" ");
}

/** Remove duplicate IDs and reuploads while preserving the first item's order. */
export function dedupeRelatedNaats(naats: Naat[]): Naat[] {
  const ids = new Set<string>();
  const titles = new Set<string>();
  const result: Naat[] = [];

  for (const naat of naats) {
    const key = titleKey(naat.title) || naat.title.trim().toLowerCase();
    if (ids.has(naat.$id) || (key && titles.has(key))) continue;
    ids.add(naat.$id);
    if (key) titles.add(key);
    result.push(naat);
  }
  return result;
}

export interface RelatedRankingOptions {
  currentId?: string;
  currentTitle: string;
  candidates: Naat[];
  profile: UserProfile;
  watchTimestamps: Record<string, number>;
  limit?: number;
}

/**
 * Rank candidates for the "Related" list.
 *
 * - Excludes the current naat, disliked naats and the same title reuploaded
 *   under another channel (they are the same content).
 * - Collapses duplicate titles, keeping the most-viewed copy.
 * - Returns a stable, score-ordered list.
 */
export function rankRelatedNaats({
  currentId,
  currentTitle,
  candidates,
  profile,
  watchTimestamps,
  limit = 10,
}: RelatedRankingOptions): Naat[] {
  if (candidates.length === 0) return [];

  const currentKey = titleKey(currentTitle);
  const preferred = userProfileService.getPreferredDuration(profile);

  // Filter first, highest-view copy wins the dedupe slot.
  const byTitle = new Map<string, Naat>();
  for (const naat of [...candidates].sort((a, b) => b.views - a.views)) {
    if (naat.$id === currentId) continue;
    if (naat.exclude) continue;
    if ((profile.dislikedNaats[naat.$id] || 0) > 0) continue;

    const key = titleKey(naat.title) || naat.title.trim().toLowerCase();
    if (!key) continue;
    if (currentKey && key === currentKey) continue; // same content, different upload
    if (!byTitle.has(key)) byTitle.set(key, naat);
  }

  const pool = [...byTitle.values()];
  if (pool.length === 0) return [];

  const maxLogViews = Math.max(
    ...pool.map((naat) => Math.log1p(naat.views + (naat.appView ?? 0))),
    1,
  );

  const scored = pool.map((naat) => {
    const similarity = titleSimilarity(currentTitle, naat.title);
    const topic = topicAffinity(tokenizeTitle(naat.title), profile.topicTerms);
    const popularity =
      Math.log1p(naat.views + (naat.appView ?? 0)) / maxLogViews;
    const recency = recencyScore(naat.uploadDate);
    const unseen = unseenScore(watchTimestamps[naat.$id]);
    const duration =
      preferred && durationBucket(getPreferredDuration(naat)) === preferred
        ? 1
        : 0.4;
    const jitter = stableJitter(naat.$id);

    const score =
      similarity * RELATED_WEIGHTS.TITLE +
      topic * RELATED_WEIGHTS.TOPIC +
      popularity * RELATED_WEIGHTS.POPULARITY +
      recency * RELATED_WEIGHTS.RECENCY +
      unseen * RELATED_WEIGHTS.UNSEEN +
      duration * RELATED_WEIGHTS.DURATION +
      jitter * RELATED_WEIGHTS.JITTER;

    return { naat, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.naat);
}
