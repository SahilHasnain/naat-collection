/**
 * Format file size from bytes to human-readable format (MB/GB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 MB";

  const mb = bytes / (1024 * 1024);

  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  } else {
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }
}

/**
 * Format a number to a compact string (e.g., 1.2K, 3.5M, 1.1B)
 */
export function formatViews(views: number): string {
  if (views < 1000) {
    return views?.toString();
  }

  if (views < 1_000_000) {
    const thousands = views / 1000;
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
  }

  if (views < 1_000_000_000) {
    const millions = views / 1_000_000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }

  const billions = views / 1_000_000_000;
  return billions % 1 === 0 ? `${billions}B` : `${billions.toFixed(1)}B`;
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
