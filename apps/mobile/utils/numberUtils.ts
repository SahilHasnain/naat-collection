/**
 * Format a number to a compact string (e.g., 1.2K, 3.5M, 1.1B)
 */
export const formatViews = (views: number): string => {
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
};
