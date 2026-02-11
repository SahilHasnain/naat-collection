"use client";

import { useIsDesktop } from "@/hooks/useMediaQuery";
import { FloatingPlayer } from "./FloatingPlayer";
import { MiniPlayer } from "./MiniPlayer";

export function ResponsivePlayer() {
  const isDesktop = useIsDesktop();

  // Show FloatingPlayer on desktop (>=768px), MiniPlayer on mobile
  return isDesktop ? <FloatingPlayer /> : <MiniPlayer />;
}
