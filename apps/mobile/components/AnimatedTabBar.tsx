import { colors } from "@/constants/theme";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AnimatedTabBarProps extends BottomTabBarProps {
  translateY: Animated.SharedValue<number>;
}

export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
  translateY,
}: AnimatedTabBarProps) {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 68;

  // Total height including safe area insets
  const totalHeight = TAB_BAR_HEIGHT + insets.bottom;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Filter out routes that should be hidden (video and +not-found)
  const visibleRoutes = state.routes.filter((route) => {
    // Hide specific routes by name
    return route.name !== "video" && route.name !== "+not-found";
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          backgroundColor: colors.background.elevated,
          borderTopColor: colors.background.elevated,
          borderTopWidth: 1,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        animatedStyle,
      ]}
    >
      {visibleRoutes.map((route) => {
        const index = state.routes.indexOf(route);
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        // Get icon from options
        const icon = options.tabBarIcon
          ? options.tabBarIcon({
              focused: isFocused,
              color: isFocused
                ? colors.accent.secondary
                : colors.text.secondary,
              size: 24,
            })
          : null;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
            <Text
              style={{
                color: isFocused
                  ? colors.accent.secondary
                  : colors.text.secondary,
                fontSize: 12,
                fontWeight: "600",
                marginTop: 4,
              }}
            >
              {typeof label === "string" ? label : ""}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}
