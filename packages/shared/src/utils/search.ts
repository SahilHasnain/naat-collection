/**
 * Custom search algorithm for naats
 *
 * Features:
 * - All search words must be present in the title
 * - Relevance-based scoring (exact phrase > word order > all words present)
 * - Fast performance (no fuzzy matching overhead)
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
  itemText: string,
  queryWords: string[],
  originalQuery: string,
): number {
  const normalizedItem = normalizeText(itemText);
  const normalizedQuery = normalizeText(originalQuery);

  // Check for exact phrase match (highest score)
  if (normalizedItem.includes(normalizedQuery)) {
    return 100;
  }

  // Check if all query words are present
  const allWordsPresent = queryWords.every((word) =>
    normalizedItem.includes(word),
  );

  if (!allWordsPresent) {
    return 0; // Exclude items that don't have all words
  }

  // Check if words appear in order
  let lastIndex = -1;
  let inOrder = true;

  for (const word of queryWords) {
    const index = normalizedItem.indexOf(word, lastIndex + 1);
    if (index === -1 || index <= lastIndex) {
      inOrder = false;
      break;
    }
    lastIndex = index;
  }

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
  const queryWords = extractWords(query);

  // If no meaningful words, return empty
  if (queryWords.length === 0) {
    return [];
  }

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    // Calculate score for title
    let score = calculateScore(item.title, queryWords, query);

    // If title doesn't match and channel search is enabled, try channel
    if (score === 0 && searchInChannel && item.channelName) {
      score = calculateScore(item.channelName, queryWords, query) * 0.5; // Channel matches get 50% weight
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
