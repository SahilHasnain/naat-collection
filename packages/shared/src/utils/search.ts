/**
 * Custom search algorithm for naats
 *
 * Features:
 * - All search words must be present in the title
 * - Relevance-based scoring (exact phrase > word order > all words present)
 * - Lightweight fuzzy/transliteration matching for Roman Urdu spelling variants
 * - Ignores small connector words (e, ke, ka, ki, etc.)
 */

interface SearchableItem {
  title: string;
  channelName?: string;
}

interface SearchResult<T> {
  item: T;
  score: number;
}

interface PreparedWord {
  raw: string;
  canonical: string;
  skeleton: string;
}

interface PreparedText {
  normalized: string;
  canonicalPhrase: string;
  words: PreparedWord[];
}

/**
 * Small words to ignore in search (Urdu/Hindi connectors)
 */
const IGNORE_WORDS = new Set([
  "e",
  "ke",
  "ka",
  "ki",
  "ko",
  "se",
  "me",
  "mein",
  "par",
  "pe",
  "aur",
  "ya",
  "hai",
  "hain",
  "tha",
  "the",
  "thi",
  "ho",
  "he",
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
]);

const canonicalWordCache = new Map<string, string>();
const wordSkeletonCache = new Map<string, string>();
const preparedTextCache = new Map<string, PreparedText>();
const wordEquivalenceCache = new Map<string, boolean>();

/**
 * Normalize text for searching
 * - Convert to lowercase
 * - Remove special characters
 * - Normalize whitespace
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace special chars with space
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Canonicalize a single romanized word so common spelling variants
 * like "shamsudduha", "shamshudduha", "aankhon", "ankhon" compare better.
 */
function canonicalizeWord(word: string): string {
  const cached = canonicalWordCache.get(word);
  if (cached) {
    return cached;
  }

  const canonical = word
    .toLowerCase()
    .replace(/[^\w]/g, "")
    .replace(/sch/g, "sh")
    .replace(/ph/g, "f")
    .replace(/q/g, "k")
    .replace(/ck/g, "k")
    .replace(/zh/g, "z")
    .replace(/kh/g, "k")
    .replace(/gh/g, "g")
    .replace(/dh/g, "d")
    .replace(/th/g, "t")
    .replace(/aa|ah/g, "a")
    .replace(/ee|ii|ei|ey/g, "i")
    .replace(/oo|ou|ow|uu/g, "u")
    .replace(/([a-z])\1+/g, "$1");

  canonicalWordCache.set(word, canonical);
  return canonical;
}

function getWordSkeleton(word: string): string {
  const cached = wordSkeletonCache.get(word);
  if (cached) {
    return cached;
  }

  const canonical = canonicalizeWord(word);
  if (canonical.length <= 3) {
    wordSkeletonCache.set(word, canonical);
    return canonical;
  }

  const first = canonical[0];
  const rest = canonical.slice(1).replace(/[aeiouy]/g, "");
  const skeleton = `${first}${rest}`;
  wordSkeletonCache.set(word, skeleton);
  return skeleton;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }

    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
}

function areWordsEquivalent(queryWord: string, itemWord: string): boolean {
  const cacheKey = `${queryWord}::${itemWord}`;
  const cached = wordEquivalenceCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  if (queryWord === itemWord) {
    wordEquivalenceCache.set(cacheKey, true);
    return true;
  }

  const canonicalQuery = canonicalizeWord(queryWord);
  const canonicalItem = canonicalizeWord(itemWord);

  if (
    canonicalQuery === canonicalItem ||
    canonicalQuery.includes(canonicalItem) ||
    canonicalItem.includes(canonicalQuery)
  ) {
    wordEquivalenceCache.set(cacheKey, true);
    return true;
  }

  const querySkeleton = getWordSkeleton(queryWord);
  const itemSkeleton = getWordSkeleton(itemWord);

  if (querySkeleton === itemSkeleton) {
    wordEquivalenceCache.set(cacheKey, true);
    return true;
  }

  if (Math.abs(canonicalQuery.length - canonicalItem.length) > 3) {
    wordEquivalenceCache.set(cacheKey, false);
    return false;
  }

  const canonicalDistance = levenshteinDistance(canonicalQuery, canonicalItem);
  const skeletonDistance = levenshteinDistance(querySkeleton, itemSkeleton);
  const maxLength = Math.max(canonicalQuery.length, canonicalItem.length);

  if (maxLength <= 4) {
    const result = canonicalDistance <= 1 || skeletonDistance <= 1;
    wordEquivalenceCache.set(cacheKey, result);
    return result;
  }

  if (maxLength <= 8) {
    const result = canonicalDistance <= 2 || skeletonDistance <= 1;
    wordEquivalenceCache.set(cacheKey, result);
    return result;
  }

  const result = canonicalDistance <= 3 || skeletonDistance <= 2;
  wordEquivalenceCache.set(cacheKey, result);
  return result;
}

/**
 * Extract meaningful words from text
 * - Splits by whitespace
 * - Filters out small connector words
 * - Returns array of significant words
 */
function extractWords(text: string): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(" ");

  return words.filter((word) => {
    // Keep words that are:
    // 1. Not in ignore list
    // 2. At least 2 characters long
    return word.length >= 2 && !IGNORE_WORDS.has(word);
  });
}

function prepareText(text: string): PreparedText {
  const cached = preparedTextCache.get(text);
  if (cached) {
    return cached;
  }

  const normalized = normalizeText(text);
  const words = extractWords(text).map((raw) => ({
    raw,
    canonical: canonicalizeWord(raw),
    skeleton: getWordSkeleton(raw),
  }));

  const prepared = {
    normalized,
    canonicalPhrase: words.map((word) => word.canonical).join(" "),
    words,
  };

  preparedTextCache.set(text, prepared);
  return prepared;
}

function wordsInOrder(queryWords: PreparedWord[], itemWords: PreparedWord[]): boolean {
  let lastMatchIndex = -1;

  for (const queryWord of queryWords) {
    let matchedIndex = -1;

    for (let i = lastMatchIndex + 1; i < itemWords.length; i++) {
      if (areWordsEquivalent(queryWord.raw, itemWords[i].raw)) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      return false;
    }

    lastMatchIndex = matchedIndex;
  }

  return true;
}

/**
 * Calculate search score for an item
 *
 * Scoring:
 * - 100: Exact phrase match
 * - 80: All words present in correct order
 * - 60: All words present (any order)
 * - 0: Missing words (excluded from results)
 */
function calculateScore(
  itemText: PreparedText,
  query: PreparedText,
): number {
  // Check for exact phrase match (highest score)
  if (
    itemText.normalized.includes(query.normalized) ||
    itemText.canonicalPhrase.includes(query.canonicalPhrase)
  ) {
    return 100;
  }

  // Check if all query words are present
  const allWordsPresent = query.words.every((queryWord) =>
    itemText.words.some((itemWord) =>
      areWordsEquivalent(queryWord.raw, itemWord.raw),
    ),
  );

  if (!allWordsPresent) {
    return 0; // Exclude items that don't have all words
  }

  // Check if words appear in order
  const inOrder = wordsInOrder(query.words, itemText.words);

  // All words present in order
  if (inOrder) {
    return 80;
  }

  // All words present but not in order
  return 60;
}

/**
 * Search through items with custom algorithm
 *
 * @param items - Array of items to search
 * @param query - Search query string
 * @param options - Search options
 * @returns Sorted array of items by relevance
 */
export function searchItems<T extends SearchableItem>(
  items: T[],
  query: string,
  options: {
    searchInChannel?: boolean; // Also search in channel name
    minScore?: number; // Minimum score to include (default: 60)
  } = {},
): T[] {
  const { searchInChannel = true, minScore = 60 } = options;

  // Empty query returns empty results
  if (!query.trim()) {
    return [];
  }

  // Extract meaningful words from query
  const preparedQuery = prepareText(query);

  // If no meaningful words, return empty
  if (preparedQuery.words.length === 0) {
    return [];
  }

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    const preparedTitle = prepareText(item.title);
    // Calculate score for title
    let score = calculateScore(preparedTitle, preparedQuery);

    // If title doesn't match and channel search is enabled, try channel
    if (score === 0 && searchInChannel && item.channelName) {
      score = calculateScore(prepareText(item.channelName), preparedQuery) * 0.5; // Channel matches get 50% weight
    }

    // Only include items that meet minimum score
    if (score >= minScore) {
      results.push({ item, score });
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  // Return just the items
  return results.map((result) => result.item);
}

/**
 * Highlight matching words in text
 * Useful for displaying search results with highlighted terms
 */
export function highlightMatches(
  text: string,
  query: string,
): { text: string; isMatch: boolean }[] {
  if (!query.trim()) {
    return [{ text, isMatch: false }];
  }

  const queryWords = extractWords(query);
  if (queryWords.length === 0) {
    return [{ text, isMatch: false }];
  }

  const normalizedText = normalizeText(text);
  const parts: { text: string; isMatch: boolean }[] = [];

  let currentIndex = 0;
  const matches: { start: number; end: number }[] = [];

  // Find all word matches
  for (const word of queryWords) {
    let searchIndex = 0;
    while (true) {
      const index = normalizedText.indexOf(word, searchIndex);
      if (index === -1) break;

      matches.push({ start: index, end: index + word.length });
      searchIndex = index + 1;
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Merge overlapping matches
  const merged: { start: number; end: number }[] = [];
  for (const match of matches) {
    if (merged.length === 0) {
      merged.push(match);
    } else {
      const last = merged[merged.length - 1];
      if (match.start <= last.end) {
        last.end = Math.max(last.end, match.end);
      } else {
        merged.push(match);
      }
    }
  }

  // Build result with highlighted parts
  for (const match of merged) {
    // Add non-matching text before this match
    if (currentIndex < match.start) {
      parts.push({
        text: text.substring(currentIndex, match.start),
        isMatch: false,
      });
    }

    // Add matching text
    parts.push({
      text: text.substring(match.start, match.end),
      isMatch: true,
    });

    currentIndex = match.end;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push({
      text: text.substring(currentIndex),
      isMatch: false,
    });
  }

  return parts;
}
