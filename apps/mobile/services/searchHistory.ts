import AsyncStorage from "@react-native-async-storage/async-storage";

const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY_ITEMS = 20;

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
}

/**
 * Get all search history items
 */
export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("Error getting search history:", error);
    return [];
  }
}

/**
 * Add a search query to history
 * - Removes duplicates (moves to top if exists)
 * - Limits to MAX_HISTORY_ITEMS
 */
export async function addToSearchHistory(query: string): Promise<void> {
  try {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const history = await getSearchHistory();

    // Remove existing entry if it exists
    const filtered = history.filter(
      (item) => item.query.toLowerCase() !== trimmedQuery.toLowerCase(),
    );

    // Add new entry at the beginning
    const newItem: SearchHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      query: trimmedQuery,
      timestamp: Date.now(),
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error adding to search history:", error);
  }
}

/**
 * Remove a specific search history item
 */
export async function removeFromSearchHistory(id: string): Promise<void> {
  try {
    const history = await getSearchHistory();
    const filtered = history.filter((item) => item.id !== id);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing from search history:", error);
  }
}

/**
 * Clear all search history
 */
export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error("Error clearing search history:", error);
  }
}

/**
 * Search within history
 */
export async function searchInHistory(
  query: string,
): Promise<SearchHistoryItem[]> {
  try {
    const history = await getSearchHistory();
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) return history;

    return history.filter((item) =>
      item.query.toLowerCase().includes(lowerQuery),
    );
  } catch (error) {
    console.error("Error searching in history:", error);
    return [];
  }
}
