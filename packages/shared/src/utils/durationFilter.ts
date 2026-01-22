import type { Naat } from "../types";

export type DurationOption = "all" | "short" | "medium" | "long";

/**
 * Filter naats by duration
 * @param naats - Array of naats to filter
 * @param duration - Duration filter option
 * @returns Filtered array of naats
 */
export function filterNaatsByDuration(
  naats: Naat[],
  duration: DurationOption,
): Naat[] {
  if (duration === "all") {
    return naats;
  }

  return naats.filter((naat) => {
    const durationInMinutes = naat.duration / 60;

    switch (duration) {
      case "short":
        return durationInMinutes < 5;
      case "medium":
        return durationInMinutes >= 5 && durationInMinutes <= 15;
      case "long":
        return durationInMinutes > 15;
      default:
        return true;
    }
  });
}
