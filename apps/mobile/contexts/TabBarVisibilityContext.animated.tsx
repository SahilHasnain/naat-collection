import React, { createContext, useCallback, useContext, useRef } from "react";
import type Animated from "react-native-reanimated";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";

interface TabBarVisibilityContextType {
  handleScroll: (event: any) => void;
  translateY: Animated.SharedValue<number>;
  tabBarHeight: number;
}

const TabBarVisibilityContext = createContext<
  TabBarVisibilityContextType | undefined
>(undefined);

const SCROLL_THRESHOLD = 5; // Minimum pixels to trigger direction change
const TAB_BAR_HEIGHT = 68; // Base tab bar height (adjust based on your design)

export function TabBarVisibilityProvider({
  children,
  tabBarHeight = TAB_BAR_HEIGHT,
}: {
  children: React.ReactNode;
  tabBarHeight?: number;
}) {
  const translateY = useSharedValue(0);
  const prevScrollY = useRef(0);
  const lastDirection = useRef<"up" | "down">("up");

  const handleScroll = useCallback(
    (event: any) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;

      // Don't hide tab bar when at the top
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

          const targetPosition = newDirection === "down" ? tabBarHeight : 0;

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
    [tabBarHeight, translateY],
  );

  return (
    <TabBarVisibilityContext.Provider
      value={{ handleScroll, translateY, tabBarHeight }}
    >
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const context = useContext(TabBarVisibilityContext);
  if (!context) {
    throw new Error(
      "useTabBarVisibility must be used within TabBarVisibilityProvider",
    );
  }
  return context;
}
