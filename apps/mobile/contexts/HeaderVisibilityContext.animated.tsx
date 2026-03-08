import React, { createContext, useCallback, useContext, useRef } from "react";
import { Easing, SharedValue, useSharedValue, withTiming } from "react-native-reanimated";

interface HeaderVisibilityContextType {
  handleScroll: (event: any) => void;
  translateY: SharedValue<number>;
  headerHeight: number;
  showHeader: () => void; // Force show header and reset state
  isScrolledDown: SharedValue<boolean>; // Track if user has scrolled down
}

const HeaderVisibilityContext = createContext<
  HeaderVisibilityContextType | undefined
>(undefined);

const SCROLL_THRESHOLD = 5; // Minimum pixels to trigger direction change
const HEADER_HEIGHT = 100; // Base header height (adjust based on your design)
const SCROLL_DOWN_THRESHOLD = 100; // Pixels scrolled to consider "scrolled down"

export function HeaderVisibilityProvider({
  children,
  headerHeight = HEADER_HEIGHT,
}: {
  children: React.ReactNode;
  headerHeight?: number;
}) {
  const translateY = useSharedValue(0);
  const isScrolledDown = useSharedValue(false);
  const prevScrollY = useRef(0);
  const lastDirection = useRef<"up" | "down">("up");
  const needsSync = useRef(false); // Flag to sync scroll position on next event

  const showHeader = useCallback(() => {
    // Reset to visible state
    translateY.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    // Reset direction and mark that we need to sync scroll position
    lastDirection.current = "up";
    needsSync.current = true;
  }, [translateY]);

  const handleScroll = useCallback(
    (event: any) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;

      // Update isScrolledDown flag
      isScrolledDown.value = currentScrollY > SCROLL_DOWN_THRESHOLD;

      // If we need to sync, just update prevScrollY without animating
      if (needsSync.current) {
        prevScrollY.current = currentScrollY;
        needsSync.current = false;
        // Don't return - continue to process this scroll event normally
        // but the diff will be 0 so no animation will trigger
      }

      // Don't hide header when at the top
      if (currentScrollY <= 0) {
        translateY.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        });
        prevScrollY.current = currentScrollY;
        lastDirection.current = "up";
        return;
      }

      const scrollDiff = currentScrollY - prevScrollY.current;

      // Only update if scroll exceeds threshold
      if (Math.abs(scrollDiff) > SCROLL_THRESHOLD) {
        const newDirection = scrollDiff > 0 ? "down" : "up";

        // Only animate if direction actually changed
        if (lastDirection.current !== newDirection) {
          lastDirection.current = newDirection;

          const targetPosition = newDirection === "down" ? -headerHeight : 0;

          translateY.value = withTiming(targetPosition, {
            duration: 300,
            easing:
              newDirection === "down"
                ? Easing.in(Easing.ease) // Accelerate when hiding
                : Easing.out(Easing.ease), // Decelerate when showing
          });
        }
      }

      prevScrollY.current = currentScrollY;
    },
    [headerHeight, translateY, isScrolledDown],
  );

  return (
    <HeaderVisibilityContext.Provider
      value={{
        handleScroll,
        translateY,
        headerHeight,
        showHeader,
        isScrolledDown,
      }}
    >
      {children}
    </HeaderVisibilityContext.Provider>
  );
}

export function useHeaderVisibility() {
  const context = useContext(HeaderVisibilityContext);
  if (!context) {
    throw new Error(
      "useHeaderVisibility must be used within HeaderVisibilityProvider",
    );
  }
  return context;
}
