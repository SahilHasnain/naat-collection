import { colors } from "@/constants/theme";
import { AuthModal } from "@/components/AuthModal";
import { Ionicons } from "@expo/vector-icons";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Pressable from "./ResponsivePressable";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const brand = require("../brand.config.js");
const NATIVE_APP_URL = `https://play.google.com/store/apps/details?id=${brand.app.packageId}`;

interface AnimatedTabBarProps extends BottomTabBarProps {
  translateY: SharedValue<number>;
  networkIndicatorOffset: SharedValue<number>;
  onSearchTabPress?: () => void;
}

export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
  translateY,
  networkIndicatorOffset,
  onSearchTabPress,
}: AnimatedTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDesktopWeb } = useResponsiveLayout();
  const TAB_BAR_HEIGHT = 56; // Reduced height for cleaner look
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const [authModalVisible, setAuthModalVisible] = React.useState(false);
  const { preference, cycleTheme } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    if (isDesktopWeb) {
      return {};
    }

    return {
      transform: [{ translateY: translateY.value }],
      // Shift up by network indicator height when tab bar is visible
      bottom: translateY.value > 0 ? 0 : networkIndicatorOffset.value,
    };
  });

  // Filter out routes that should be hidden
  const visibleRoutes = state.routes.filter((route) => {
    return (
      route.name !== "live" &&
      route.name !== "favorites" &&
      route.name !== "downloads" &&
      route.name !== "video" &&
      route.name !== "player" &&
      route.name !== "naat" &&
      !route.name.startsWith("naat/") &&
      route.name !== "+not-found" &&
      route.name !== "index"
    );
  });
  const libraryIndex = visibleRoutes.findIndex((route) => route.name === "library");

  return (
    <>
      {libraryOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setLibraryOpen(false)}
          accessibilityLabel="Close library menu"
        />
      )}
      <Animated.View
      style={[
        {
          position: "absolute",
          ...(isDesktopWeb
            ? {
                top: 0,
                bottom: 0,
                left: 0,
                width: 224,
                flexDirection: "column",
                paddingTop: 72,
              }
            : {
                bottom: 0,
                left: 0,
                right: 0,
                flexDirection: "row",
              }),
          backgroundColor: colors.background.primary, // YouTube dark gray
          borderTopColor: colors.border.secondary,
          ...(isDesktopWeb
            ? { borderRightColor: colors.border.secondary, borderRightWidth: 1 }
            : {
                borderTopWidth: 0.5,
                height: TAB_BAR_HEIGHT + insets.bottom,
                paddingBottom: insets.bottom + 4,
              }),
          zIndex: 100,
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
          if (route.name === "library") {
            setLibraryOpen((open) => !open);
            return;
          }

          // The Search tab is an action, not a screen: focus the global search bar.
          if (route.name === "search") {
            onSearchTabPress?.();
            return;
          }

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
            color: isFocused ? colors.text.inverse : colors.text.tertiary,
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
              ...(isDesktopWeb
                ? {
                    height: 56,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    gap: 12,
                  }
                : {
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: 8,
                  }),
            }}
          >
            <View
              style={
                isDesktopWeb
                  ? { flexDirection: "row", alignItems: "center", gap: 12 }
                  : { alignItems: "center" }
              }
            >
              {icon}
              <Text
                style={{
                  color: isFocused ? colors.text.primary : colors.text.tertiary,
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

      {libraryOpen && (
        <View
          style={[
            styles.libraryPopover,
            isDesktopWeb
              ? { left: 224, top: 112 + libraryIndex * 56 }
              : { right: 8, bottom: TAB_BAR_HEIGHT + insets.bottom + 8 },
          ]}
        >
          <Pressable
            onPress={() => {
              setLibraryOpen(false);
              navigation.navigate("favorites");
            }}
            style={styles.libraryItem}
            accessibilityRole="button"
            accessibilityLabel="Open favorites"
          >
            <Text style={styles.libraryItemText}>Favorites</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setLibraryOpen(false);
              navigation.navigate("downloads");
            }}
            style={styles.libraryItem}
            accessibilityRole="button"
            accessibilityLabel="Open downloads"
          >
            <Text style={styles.libraryItemText}>Downloads</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setLibraryOpen(false);
              setAuthModalVisible(true);
            }}
            style={styles.libraryItem}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Ionicons name="person-outline" size={18} color={colors.text.primary} />
            <Text style={styles.libraryItemText}>Profile</Text>
            </Pressable>
          <Pressable
            onPress={cycleTheme}
            style={styles.libraryItem}
            accessibilityRole="button"
            accessibilityLabel="Change theme"
          >
            <Ionicons
              name={preference === "light" ? "sunny-outline" : preference === "dark" ? "moon-outline" : "contrast-outline"}
              size={18}
              color={colors.text.primary}
            />
            <Text style={styles.libraryItemText}>
              Theme: {preference[0].toUpperCase() + preference.slice(1)}
            </Text>
          </Pressable>
          {!isDesktopWeb && Platform.OS === "web" && (
            <Pressable
              onPress={() => {
                setLibraryOpen(false);
                void Linking.openURL(NATIVE_APP_URL);
              }}
              style={styles.libraryItem}
              accessibilityRole="button"
              accessibilityLabel="Install app"
            >
              <Ionicons name="download-outline" size={18} color={colors.text.primary} />
              <Text style={styles.libraryItemText}>Install App</Text>
            </Pressable>
          )}
        </View>
      )}
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  libraryPopover: {
    position: "absolute",
    minWidth: 180,
    borderRadius: 14,
    paddingVertical: 6,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    zIndex: 110,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  libraryItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  libraryItemText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
