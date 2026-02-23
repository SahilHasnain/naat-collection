# Animated Tab Bar with Expo Router - Complete Guide

## Overview

This implementation uses `react-native-reanimated` to create smooth 60fps animations for hiding/showing the tab bar on scroll, similar to YouTube's mobile app.

## Architecture

### 1. Context Provider (`TabBarVisibilityContext.animated.tsx`)

- Manages scroll state using `useSharedValue` from Reanimated
- Provides `translateY` shared value for animations
- Handles scroll direction detection with threshold logic

### 2. Custom Tab Bar Component (`AnimatedTabBar.tsx`)

- Custom implementation of the bottom tab bar
- Receives `translateY` shared value as prop
- Uses `Animated.View` with animated styles
- Renders tab buttons with icons and labels

### 3. Layout Integration (`_layout.tsx`)

- Wraps app with `TabBarVisibilityProvider`
- Uses `tabBar` prop to inject custom `AnimatedTabBar`
- Passes `translateY` from context to custom tab bar

### 4. Screen Integration (`index.tsx`, etc.)

- Each scrollable screen uses `useTabBarVisibility()` hook
- Calls `handleScroll` in FlatList/ScrollView `onScroll`
- Sets `scrollEventThrottle={16}` for smooth 60fps tracking

## How It Works

### Scroll Detection Logic

```typescript
const currentScrollY = event.nativeEvent.contentOffset.y;
const scrollDiff = currentScrollY - prevScrollY.current;

if (Math.abs(scrollDiff) > SCROLL_THRESHOLD) {
  const newDirection = scrollDiff > 0 ? "down" : "up";
  // Animate tab bar based on direction
}
```

### Animation with Reanimated

```typescript
translateY.value = withTiming(targetPosition, {
  duration: 300,
  easing:
    newDirection === "down"
      ? Easing.in(Easing.ease) // Accelerate when hiding
      : Easing.out(Easing.ease), // Decelerate when showing
});
```

### Custom Tab Bar Rendering

```typescript
<Animated.View style={[styles, animatedStyle]}>
  {state.routes.map((route, index) => (
    <TabButton key={route.key} {...props} />
  ))}
</Animated.View>
```

## Key Differences from Basic Version

| Feature           | Basic Version        | Animated Version        |
| ----------------- | -------------------- | ----------------------- |
| Animation Library | Inline styles        | react-native-reanimated |
| Performance       | Good                 | Excellent (60fps)       |
| Tab Bar           | Built-in Expo Router | Custom component        |
| Easing            | None                 | Accelerate/Decelerate   |
| Complexity        | Simple               | Moderate                |

## Implementation Steps

### Step 1: Install Dependencies

```bash
npx expo install react-native-reanimated
```

### Step 2: Configure Reanimated

Add to `babel.config.js`:

```javascript
module.exports = {
  presets: ["babel-preset-expo"],
  plugins: ["react-native-reanimated/plugin"], // Must be last
};
```

### Step 3: Use Animated Context

In `_layout.tsx`:

```typescript
import { TabBarVisibilityProvider, useTabBarVisibility }
  from "@/contexts/TabBarVisibilityContext.animated";
import { AnimatedTabBar } from "@/components/AnimatedTabBar";

function RootLayoutContent() {
  const { translateY } = useTabBarVisibility();

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} translateY={translateY} />}
    >
      {/* Your tabs */}
    </Tabs>
  );
}

function RootLayout() {
  return (
    <TabBarVisibilityProvider>
      <RootLayoutContent />
    </TabBarVisibilityProvider>
  );
}
```

### Step 4: Integrate in Screens

In any scrollable screen:

```typescript
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext.animated";

export default function YourScreen() {
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();

  const handleScroll = (event: any) => {
    // Your scroll logic
    handleTabBarScroll(event);
  };

  return (
    <FlatList
      onScroll={handleScroll}
      scrollEventThrottle={16} // 60fps
    />
  );
}
```

## Customization Options

### Adjust Tab Bar Height

In `TabBarVisibilityContext.animated.tsx`:

```typescript
const TAB_BAR_HEIGHT = 80; // Change from 68
```

Also update in `AnimatedTabBar.tsx`:

```typescript
const TAB_BAR_HEIGHT = 80; // Must match context
```

### Change Animation Duration

```typescript
translateY.value = withTiming(targetPosition, {
  duration: 200, // Faster (was 300)
});
```

### Custom Easing Functions

```typescript
import { Easing } from "react-native-reanimated";

// Bouncy effect
easing: Easing.elastic(1);

// Custom bezier curve
easing: Easing.bezier(0.25, 0.1, 0.25, 1);

// Linear (no easing)
easing: Easing.linear;
```

### Adjust Scroll Sensitivity

```typescript
const SCROLL_THRESHOLD = 10; // More sensitive (was 5)
const SCROLL_THRESHOLD = 3; // Less sensitive
```

### Customize Tab Bar Appearance

In `AnimatedTabBar.tsx`, modify the styles:

```typescript
{
  backgroundColor: '#1a1a1a', // Dark background
  borderTopWidth: 2,
  borderTopColor: '#333',
  // Add blur effect (iOS)
  ...Platform.select({
    ios: {
      backgroundColor: 'rgba(26, 26, 26, 0.8)',
      backdropFilter: 'blur(10px)',
    },
  }),
}
```

## Performance Optimization

### 1. Use Worklets

For complex animations, use worklet functions:

```typescript
"worklet";
const handleScroll = (event: any) => {
  "worklet";
  // Animation logic runs on UI thread
};
```

### 2. Reduce Re-renders

- Use `useCallback` for scroll handlers
- Memoize tab bar components
- Use `React.memo` for tab buttons

### 3. Optimize FlatList

```typescript
<FlatList
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
  initialNumToRender={10}
  scrollEventThrottle={16}
/>
```

## Troubleshooting

### Tab bar doesn't animate

1. Check Reanimated is installed: `npx expo install react-native-reanimated`
2. Verify babel plugin is added and is LAST in plugins array
3. Clear cache: `npx expo start -c`
4. Ensure `scrollEventThrottle={16}` is set

### Animations are choppy

1. Check device performance (test on physical device)
2. Reduce animation duration
3. Simplify easing functions
4. Use worklets for better performance

### Tab bar flickers

1. Increase `SCROLL_THRESHOLD` value
2. Check for conflicting scroll handlers
3. Ensure only one scroll handler calls `handleTabBarScroll`

### TypeScript errors

1. Install types: `npm install --save-dev @types/react-native-reanimated`
2. Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["react-native-reanimated"]
  }
}
```

## Comparison with Other Approaches

### vs. React Navigation's tabBarStyle

- **Pros**: More control, smoother animations, custom styling
- **Cons**: More code, manual tab bar implementation

### vs. Inline Style Animations

- **Pros**: 60fps performance, runs on UI thread, smoother
- **Cons**: Requires Reanimated dependency, more complex

### vs. Animated API

- **Pros**: Better performance, modern API, declarative
- **Cons**: Learning curve, different mental model

## Best Practices

1. **Always use scrollEventThrottle={16}** for 60fps tracking
2. **Test on physical devices** for accurate performance
3. **Use threshold** to prevent jittery animations
4. **Keep animations short** (200-300ms) for responsiveness
5. **Match tab bar height** between context and component
6. **Use worklets** for complex animation logic
7. **Memoize components** to reduce re-renders
8. **Handle edge cases** (top of scroll, fast scrolling)

## Advanced Features

### Add Blur Effect (iOS)

```typescript
import { BlurView } from 'expo-blur';

<BlurView intensity={80} tint="dark" style={styles.tabBar}>
  {/* Tab buttons */}
</BlurView>
```

### Add Haptic Feedback

```typescript
import * as Haptics from "expo-haptics";

const onPress = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  navigation.navigate(route.name);
};
```

### Add Badge Indicators

```typescript
<View style={styles.badge}>
  <Text style={styles.badgeText}>3</Text>
</View>
```

### Animate Tab Icons

```typescript
const scale = useSharedValue(1);

useEffect(() => {
  scale.value = withSpring(isFocused ? 1.2 : 1);
}, [isFocused]);

const animatedIconStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));
```

## Resources

- [Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [React Navigation Custom Tab Bar](https://reactnavigation.org/docs/bottom-tab-navigator#tabbar)
- [Medium Article: Custom Animated Tab Bar](https://medium.com/@taitasciore/custom-animated-bottom-tab-bar-in-react-native-with-react-navigation-and-reanimated-2-and-33b91851e6f1)

## Example Projects

Check out these examples for inspiration:

- Linear App - Floating tab bar with blur
- Instagram - Minimal tab bar with icons only
- Spotify - Tab bar with active indicator
- YouTube - Hide/show on scroll (this implementation!)
