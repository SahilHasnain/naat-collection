/**
 * Browser Storage Service
 *
 * Manages localStorage for watch history and For You session caching
 */

const STORAGE_KEYS = {
  WATCH_HISTORY: "naat_watch_history",
  WATCH_HISTORY_TIMESTAMPS: "naat_watch_history_timestamps",
  FOR_YOU_SESSION: "naat_for_you_session",
};

const MAX_WATCH_HISTORY = 100;
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get watch history (last 100 watched naats)
 */
export async function getWatchHistory(): Promise<string[]> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting watch history:", error);
    return [];
  }
}

/**
 * Add naat to watch history
 */
export async function addToWatchHistory(naatId: string): Promise<void> {
  try {
    const history = await getWatchHistory();

    // Remove if already exists (to move to front)
    const filtered = history.filter((id) => id !== naatId);

    // Add to front
    const updated = [naatId, ...filtered].slice(0, MAX_WATCH_HISTORY);

    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(updated));

    // Also update timestamps
    const timestamps = await getWatchHistoryTimestamps();
    timestamps[naatId] = Date.now();
    localStorage.setItem(
      STORAGE_KEYS.WATCH_HISTORY_TIMESTAMPS,
      JSON.stringify(timestamps),
    );
  } catch (error) {
    console.error("Error adding to watch history:", error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Get watch history with timestamps
 */
export async function getWatchHistoryTimestamps(): Promise<
  Record<string, number>
> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY_TIMESTAMPS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error getting watch history timestamps:", error);
    return {};
  }
}

/**
 * Save For You session order
 */
export async function saveForYouSession(naatIds: string[]): Promise<void> {
  try {
    const sessionData = {
      ids: naatIds,
      timestamp: Date.now(),
    };
    localStorage.setItem(
      STORAGE_KEYS.FOR_YOU_SESSION,
      JSON.stringify(sessionData),
    );
  } catch (error) {
    console.error("Error saving For You session:", error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Get For You session order (if still valid)
 */
export async function getForYouSession(): Promise<string[] | null> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FOR_YOU_SESSION);
    if (!data) return null;

    const sessionData = JSON.parse(data);
    const age = Date.now() - sessionData.timestamp;

    // Check if session is still valid (within 1 hour)
    if (age > SESSION_DURATION) {
      await clearForYouSession();
      return null;
    }

    return sessionData.ids;
  } catch (error) {
    console.error("Error getting For You session:", error);
    return null;
  }
}

/**
 * Clear For You session cache
 */
export async function clearForYouSession(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEYS.FOR_YOU_SESSION);
  } catch (error) {
    console.error("Error clearing For You session:", error);
  }
}
