/**
 * Utility functions for formatting data in the offline audio library
 */

import { DownloadMetadata } from "../services/audioDownload";

// Cache for formatted values
const fileSizeCache = new Map<number, string>();
const dateCache = new Map<number, string>();
const CACHE_MAX_SIZE = 100;

/**
 * Format file size from bytes to human-readable format (MB/GB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 MB";

  // Check cache first
  if (fileSizeCache.has(bytes)) {
    return fileSizeCache.get(bytes)!;
  }

  const mb = bytes / (1024 * 1024);
  let result: string;

  if (mb < 1024) {
    result = `${mb.toFixed(1)} MB`;
  } else {
    const gb = mb / 1024;
    result = `${gb.toFixed(2)} GB`;
  }

  // Cache the result
  if (fileSizeCache.size >= CACHE_MAX_SIZE) {
    // Clear oldest entry
    const firstKey = fileSizeCache.keys().next().value;
    if (firstKey !== undefined) {
      fileSizeCache.delete(firstKey);
    }
  }
  fileSizeCache.set(bytes, result);

  return result;
}

/**
 * Format download date as relative time (e.g., "just now", "2 days ago")
 */
export function formatDownloadDate(timestamp: number): string {
  // Check cache first (with 1-minute granularity to avoid stale data)
  const cacheKey = Math.floor(timestamp / 60000) * 60000;
  if (dateCache.has(cacheKey)) {
    return dateCache.get(cacheKey)!;
  }

  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let result: string;

  if (seconds < 60) {
    result = "just now";
  } else if (minutes < 60) {
    result = `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (hours < 24) {
    result = `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else if (days < 7) {
    result = `${days} ${days === 1 ? "day" : "days"} ago`;
  } else if (weeks < 4) {
    result = `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  } else if (months < 12) {
    result = `${months} ${months === 1 ? "month" : "months"} ago`;
  } else {
    result = `${years} ${years === 1 ? "year" : "years"} ago`;
  }

  // Cache the result
  if (dateCache.size >= CACHE_MAX_SIZE) {
    // Clear oldest entry
    const firstKey = dateCache.keys().next().value;
    if (firstKey !== undefined) {
      dateCache.delete(firstKey);
    }
  }
  dateCache.set(cacheKey, result);

  return result;
}

/**
 * Filter downloads by search query (searches title and channel name)
 */
export function filterDownloadsByQuery(
  downloads: DownloadMetadata[],
  query: string
): DownloadMetadata[] {
  if (!query || query.trim() === "") {
    return downloads;
  }

  const lowerQuery = query.toLowerCase().trim();

  return downloads.filter((download) => {
    const titleMatch = download.title.toLowerCase().includes(lowerQuery);
    // Note: DownloadMetadata doesn't have channelName, but we'll keep this for future extension
    // or if the metadata structure is updated
    return titleMatch;
  });
}

/**
 * Sort downloads by specified criteria
 */
export function sortDownloads(
  downloads: DownloadMetadata[],
  sortBy: "date" | "title",
  sortOrder: "asc" | "desc"
): DownloadMetadata[] {
  const sorted = [...downloads];

  sorted.sort((a, b) => {
    let comparison = 0;

    if (sortBy === "date") {
      comparison = a.downloadedAt - b.downloadedAt;
    } else if (sortBy === "title") {
      comparison = a.title.localeCompare(b.title);
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
}
