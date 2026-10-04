import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { setActiveTheme, type ThemeName } from "@/constants/theme";

export type ThemePreference = "system" | ThemeName;

const STORAGE_KEY = "@naat_theme_preference";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ThemeName;
  setPreference: (preference: ThemePreference) => void;
  cycleTheme: () => void;
  libraryOpen: boolean;
  setLibraryOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const resolvedTheme: ThemeName =
    preference === "system" ? systemTheme ?? "dark" : preference;

  setActiveTheme(resolvedTheme);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === "system" || saved === "light" || saved === "dark") {
          setPreferenceState(saved);
        }
      })
      .catch((error) => console.warn("Failed to load theme preference:", error));
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    AsyncStorage.setItem(STORAGE_KEY, nextPreference).catch((error) =>
      console.warn("Failed to save theme preference:", error),
    );
  }, []);

  const cycleTheme = useCallback(() => {
    const nextPreference: ThemePreference =
      preference === "system" ? "light" : preference === "light" ? "dark" : "system";
    setPreference(nextPreference);
  }, [preference, setPreference]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
      cycleTheme,
      libraryOpen,
      setLibraryOpen,
    }),
    [preference, resolvedTheme, setPreference, cycleTheme, libraryOpen],
  );

  return (
    <ThemeContext.Provider value={value}>
      <React.Fragment key={resolvedTheme}>{children}</React.Fragment>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
