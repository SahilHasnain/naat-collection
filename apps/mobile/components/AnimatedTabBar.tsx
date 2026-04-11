import { colors } from "@/constants/theme";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, Text, View } from "react-native";
import Animated, {
    SharedValue,
    useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Pressable from "./ResponsivePressable";

interface AnimatedTabBarProps extends BottomTabBarProps {
  translateY: SharedValue<number>;
  networkIndicatorOffset: SharedValue<number>;
}

export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
  translateY,
  networkIndicatorOffset,
}: AnimatedTabBarProps) {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 56; // Reduced height for cleaner look

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    // Shift up by network indicator height when tab bar is visible
    bottom: translateY.value > 0 ? 0 : networkIndicatorOffset.value,
  }));

  // Filter out routes that should be hidden
  const visibleRoutes = state.routes.filter((route) => {
    return (
      route.name !== "video" &&
      route.name !== "player" &&
      route.name !== "naat" &&
      !route.name.startsWith("naat/") &&
      route.name !== "+not-found" &&
      route.name !== "index"
    );
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
          backgroundColor: colors.background.primary, // YouTube dark gray
          borderTopColor: colors.border.secondary,
          borderTopWidth: 0.5,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom + 4,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -1 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
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
              color: isFocused ? "#ffffff" : "#8e8e93",
              size: 24,
            })
          : null;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 8,
            }}
          >
            <View style={{ alignItems: "center" }}>
              {icon}
              <Text
                style={{
                  color: isFocused ? colors.text.primary : "#8e8e93",
                  fontSize: 10,
                  fontWeight: "500",
                  marginTop: 4,
                }}
              >
                {typeof label === "string" ? label : ""}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}
