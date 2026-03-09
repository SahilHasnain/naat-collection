/**
 * Utility functions for grouping items by date
 */

export type DateGroup =
  | "Today"
  | "Yesterday"
  | "This Week"
  | "This Month"
  | "Older";

/**
 * Get the date group for a timestamp
 */
export function getDateGroup(timestamp: number): DateGroup {
  const now = Date.now();
  const diff = now - timestamp;

  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;

  if (diff < oneDay) {
    return "Today";
  } else if (diff < 2 * oneDay) {
    return "Yesterday";
  } else if (diff < oneWeek) {
    return "This Week";
  } else if (diff < oneMonth) {
    return "This Month";
  } else {
    return "Older";
  }
}

/**
 * Format a relative time string
 * Accepts both timestamps (number) and date strings/objects
 */
export function formatRelativeTime(date: number | string | Date): string {
  const now = Date.now();
  const timestamp = typeof date === 'number' ? date : new Date(date).getTime();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return "Just now";
  } else if (minutes > 0 && minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (hours > 0 && hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (days === 1) {
    return "Yesterday";
  } else if (days > 1 && days < 7) {
    return `${days} days ago`;
  } else if (weeks > 0 && weeks < 4) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (months > 0 && months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else if (years === 1) {
    return "1 year ago";
  } else if (years > 1) {
    return `${years} years ago`;
  } else {
    // Fallback for edge cases
    return "Just now";
  }
}

/**
 * Group items by date
 */
export function groupByDate<T extends { watchedAt: number }>(
  items: T[]
): Map<DateGroup, T[]> {
  const groups = new Map<DateGroup, T[]>();

  // Initialize all groups
  const allGroups: DateGroup[] = [
    "Today",
    "Yesterday",
    "This Week",
    "This Month",
    "Older",
  ];
  allGroups.forEach((group) => groups.set(group, []));

  // Group items
  items.forEach((item) => {
    const group = getDateGroup(item.watchedAt);
    groups.get(group)?.push(item);
  });

  // Remove empty groups
  allGroups.forEach((group) => {
    if (groups.get(group)?.length === 0) {
      groups.delete(group);
    }
  });

  return groups;
}
