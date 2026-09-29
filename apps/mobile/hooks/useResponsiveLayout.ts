import { Platform, useWindowDimensions } from "react-native";

export const WEB_DESKTOP_MIN_WIDTH = 768;

interface ResponsiveLayout {
  isDesktopWeb: boolean;
  isWeb: boolean;
}

/**
 * On web the app supports two layouts: a desktop layout with a left sidebar
 * and a native-like layout with a bottom tab bar. Whether the web layout is
 * "desktop" depends on the viewport width, so phone browsers get the native
 * experience. On native platforms the value is always false.
 */
export const useResponsiveLayout = (): ResponsiveLayout => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  return {
    isDesktopWeb: isWeb && width >= WEB_DESKTOP_MIN_WIDTH,
    isWeb,
  };
};