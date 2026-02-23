# Tab Bar Hide/Show on Scroll - Implementation Guide

## Overview

This implementation provides YouTube-style tab bar behavior where the tab bar hides when scrolling down and reappears when scrolling up.

## How It Works

### 1. Smart Scroll Detection Logic

- **Direction Detection**: Compares current scroll position with previous position
  - `currentY > previousY` → Scrolling DOWN (hide tab bar)
  - `currentY < previousY` → Scrolling UP (show tab bar)

- **Threshold System**: Uses 5px minimum scroll distance
  - Prevents jittery animations from micro-scrolls
  - Only triggers when scroll exceeds threshold

- **Top Position Handling**: Always shows tab bar when at top (scrollY ≤ 0)

### 2. Implementation Approaches

#### Basic Approach (Current Implementation)

- Uses React state and inline styles
- Simple `transform: translateY` animation
- Good for most use cases
- File: `contexts/TabBarVisibilityContext.tsx`

#### Advanced Approach (Optional - Better Performance)

- Uses `react-native-reanimated` for 60fps animations
- Smoother transitions with easing functions
- Better performance on lower-end devices
- File: `contexts/TabBarVisibilityContext.animated.tsx`

### 3. Key Components

#### TabBarVisibilityContext

Provides:

- `isTabBarVisible`: Boolean state for tab bar visibility
- `handleScroll`: Scroll event handler to track direction

#### Layout Integration

- Wraps app with `TabBarVisibilityProvider`
- Applies dynamic `tabBarStyle` with transform
- Uses `position: 'absolute'` for smooth animations

#### Screen Integration

- Each scrollable screen imports `useTabBarVisibility()`
- Calls `handleScroll` in FlatList/ScrollView `onScroll` prop
- Sets `scrollEventThrottle={16}` for 60fps tracking

## Usage in Other Screens

To add this behavior to other tabs (live, history, downloads):

```typescript
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";

export default function YourScreen() {
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();

  const handleScroll = (event: any) => {
    // Your existing scroll logic
    // ...

    // Add tab bar visibility handling
    handleTabBarScroll(event);
  };

  return (
    <FlatList
      // ... other props
      onScroll={handleScroll}
      scrollEventThrottle={16} // Important: 60fps tracking
    />
  );
}
```

## Switching to Animated Version

To use the smoother Reanimated version:

1. Install dependencies (if not already installed):

```bash
npx expo install react-native-reanimated
```

2. Update import in `_layout.tsx`:

```typescript
// Change from:
import {
  TabBarVisibilityProvider,
  useTabBarVisibility,
} from "@/contexts/TabBarVisibilityContext";

// To:
import {
  TabBarVisibilityProvider,
  useTabBarVisibility,
} from "@/contexts/TabBarVisibilityContext.animated";
```

3. Update tabBarStyle in `_layout.tsx`:

```typescript
const { animatedStyle, tabBarHeight } = useTabBarVisibility();

// In Tabs screenOptions:
tabBarStyle: [
  {
    backgroundColor: colors.background.elevated,
    // ... other styles
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  animatedStyle, // Add animated style
];
```

## Performance Considerations

- **scrollEventThrottle={16}**: Ensures 60fps scroll tracking
- **Threshold (5px)**: Filters out accidental micro-scrolls
- **Direction comparison**: Only animates when direction changes
- **useRef for prevScrollY**: Avoids unnecessary re-renders
- **Memoized callbacks**: Prevents recreation on every render

## Customization

### Adjust Scroll Sensitivity

Change `SCROLL_THRESHOLD` in the context file:

```typescript
const SCROLL_THRESHOLD = 10; // More sensitive (requires more scroll)
const SCROLL_THRESHOLD = 3; // Less sensitive (triggers easier)
```

### Adjust Animation Speed

In animated version, change duration:

```typescript
withTiming(targetPosition, {
  duration: 200, // Faster
  // or
  duration: 400, // Slower
});
```

### Different Easing Functions

```typescript
Easing.bezier(0.25, 0.1, 0.25, 1); // Custom curve
Easing.elastic(1); // Bouncy effect
Easing.linear; // No easing
```

## Troubleshooting

### Tab bar doesn't hide

- Check `scrollEventThrottle` is set to 16
- Verify `handleTabBarScroll` is called in onScroll
- Ensure FlatList has enough content to scroll

### Animations are choppy

- Switch to animated version with Reanimated
- Check device performance
- Reduce `scrollEventThrottle` value

### Tab bar flickers

- Increase `SCROLL_THRESHOLD` value
- Check for multiple scroll handlers conflicting

## References

- [Medium Article: Scroll-Aware Bottom Navigation](https://medium.com/att-israel/how-to-add-scroll-aware-bottom-navigation-in-react-native-7734c9c6206d)
- [Stack Overflow: Hide Toolbar on Scroll](https://stackoverflow.com/questions/26539623/android-lollipop-toolbar-how-to-hide-show-the-toolbar-while-scrolling)
- [React Native Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
