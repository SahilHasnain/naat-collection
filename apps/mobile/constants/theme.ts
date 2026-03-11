/**
 * Centralized Theme Configuration
 * Dark mode color palette for consistent styling across the app
 */

export const colors = {
  // Background colors - YouTube Dark Mode inspired
  background: {
    primary: "#0f0f0f", // Main background (YouTube dark gray)
    secondary: "#1f1f1f", // Secondary background (slightly lighter)
    tertiary: "#272727", // Tertiary background (cards, elevated)
    elevated: "#3f3f3f", // Elevated surfaces
  },

  // Text colors
  text: {
    primary: "rgba(255, 255, 255, 0.92)", // Primary text (soft white)
    secondary: "#aaaaaa", // Secondary text (lighter gray)
    tertiary: "#717171", // Tertiary text (medium gray)
    disabled: "#525252", // Disabled text (neutral-600)
  },

  // Border colors
  border: {
    primary: "#3f3f3f", // Primary borders
    secondary: "#272727", // Secondary borders
    subtle: "#1f1f1f", // Subtle borders
  },

  // Accent colors
  accent: {
    primary: "#1DB954", // Spotify green for audio/music
    secondary: "#2563eb", // Blue for primary actions
    success: "#10b981", // Green for success states
    error: "#ef4444", // Red for errors
    warning: "#f59e0b", // Orange for warnings
  },

  // Interactive states
  interactive: {
    hover: "#525252", // Hover state
    active: "#717171", // Active/pressed state
    disabled: "#272727", // Disabled state
  },

  // Overlay colors (with opacity)
  overlay: {
    dark: "rgba(0, 0, 0, 0.8)",
    medium: "rgba(0, 0, 0, 0.5)",
    light: "rgba(0, 0, 0, 0.3)",
  },
} as const;

// Tailwind class mappings for easy use in components
export const tw = {
  // Background classes
  bg: {
    primary: "bg-black",
    secondary: "bg-neutral-900",
    tertiary: "bg-neutral-800",
    elevated: "bg-neutral-700",
  },

  // Text classes
  text: {
    primary: "text-white",
    secondary: "text-neutral-400",
    tertiary: "text-neutral-500",
    disabled: "text-neutral-600",
  },

  // Border classes
  border: {
    primary: "border-neutral-700",
    secondary: "border-neutral-800",
    subtle: "border-neutral-900",
  },

  // Accent classes
  accent: {
    primary: "bg-[#1DB954]",
    secondary: "bg-blue-600",
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-orange-500",
  },

  // Interactive classes
  interactive: {
    hover: "active:bg-neutral-600",
    active: "active:bg-neutral-500",
  },
} as const;

// Shadow configurations
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  accent: {
    shadowColor: "#1DB954",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// Layout constants
export const layout = {
  tabBarHeight: 56,
  networkIndicatorHeight: 20, // "No connection" / "Back online" bar height
} as const;

// Common spacing values
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Border radius values
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
