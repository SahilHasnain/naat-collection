"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Create event listener
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Add listener
    media.addEventListener("change", listener);

    // Cleanup
    return () => media.removeEventListener("change", listener);
  }, [query]);

  // Return false during SSR to avoid hydration mismatch
  return mounted ? matches : false;
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
