/**
 * Centralized Theme Configuration
 * Dark mode color palette for consistent styling across the app
 */

export const colors = {
  // Background colors
  background: {
    primary: "#000000", // Main background (black)
    secondary: "#171717", // Secondary background (neutral-900)
    tertiary: "#262626", // Tertiary background (neutral-800)
    elevated: "#404040", // Elevated surfaces (neutral-700)
  },

  // Text colors
  text: {
    primary: "#ffffff", // Primary text (white)
    secondary: "#a3a3a3", // Secondary text (neutral-400)
    tertiary: "#737373", // Tertiary text (neutral-500)
    disabled: "#525252", // Disabled text (neutral-600)
  },

  // Border colors
  border: {
    primary: "#404040", // Primary borders (neutral-700)
    secondary: "#262626", // Secondary borders (neutral-800)
    subtle: "#171717", // Subtle borders (neutral-900)
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
    hover: "#525252", // Hover state (neutral-600)
    active: "#737373", // Active/pressed state (neutral-500)
    disabled: "#262626", // Disabled state (neutral-800)
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
