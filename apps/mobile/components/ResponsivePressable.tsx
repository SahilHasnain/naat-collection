import React from "react";
import { Pressable, PressableProps } from "react-native";

/**
 * Drop-in replacement for React Native's Pressable that fixes the
 * "hard press" issue inside ScrollViews / FlatLists.
 *
 * Sets `unstable_pressDelay={0}` so taps register immediately
 * instead of waiting to disambiguate from scroll gestures.
 */
const ResponsivePressable = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  PressableProps
>((props, ref) => (
  <Pressable
    ref={ref}
    unstable_pressDelay={0}
    {...props}
  />
));

ResponsivePressable.displayName = "ResponsivePressable";

export default ResponsivePressable;
