"use client";

import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useEffect, useState } from "react";

/**
 * Development helper component to show current screen size and player mode
 * Remove or disable in production
 */
export function DevScreenSize() {
  const isDesktop = useIsDesktop();
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Only show in development and after mount
  if (process.env.NODE_ENV !== "development" || windowSize.width === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/90 text-white text-xs px-3 py-2 rounded-lg border border-neutral-600 font-mono">
      <div className="flex flex-col gap-1">
        <div>
          <span className="text-neutral-400">Size:</span>{" "}
          <span className="text-accent-primary">
            {windowSize.width}x{windowSize.height}
          </span>
        </div>
        <div>
          <span className="text-neutral-400">Mode:</span>{" "}
          <span className={isDesktop ? "text-blue-400" : "text-orange-400"}>
            {isDesktop ? "Desktop (Floating)" : "Mobile (Mini)"}
          </span>
        </div>
        <div className="text-neutral-500 text-[10px] mt-1">
          Breakpoint: 768px
        </div>
      </div>
    </div>
  );
}
