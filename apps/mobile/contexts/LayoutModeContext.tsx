import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type LayoutMode = "grid" | "youtube";

const STORAGE_KEY = "@naat_layout_mode";

interface LayoutModeContextType {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleLayoutMode: () => void;
}

const LayoutModeContext = createContext<LayoutModeContextType | undefined>(
  undefined,
);

export const LayoutModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>("grid");

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (mounted && (saved === "grid" || saved === "youtube")) {
          setLayoutModeState(saved);
        }
      })
      .catch((error) => {
        console.log("Failed to load layout mode:", error);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch((error) => {
      console.log("Failed to save layout mode:", error);
    });
  }, []);

  const toggleLayoutMode = useCallback(() => {
    setLayoutModeState((prev) => {
      const next: LayoutMode = prev === "grid" ? "youtube" : "grid";
      AsyncStorage.setItem(STORAGE_KEY, next).catch((error) => {
        console.log("Failed to save layout mode:", error);
      });
      return next;
    });
  }, []);

  const value: LayoutModeContextType = {
    layoutMode,
    setLayoutMode,
    toggleLayoutMode,
  };

  return (
    <LayoutModeContext.Provider value={value}>
      {children}
    </LayoutModeContext.Provider>
  );
};

export const useLayoutMode = () => {
  const context = useContext(LayoutModeContext);
  if (context === undefined) {
    throw new Error("useLayoutMode must be used within LayoutModeProvider");
  }
  return context;
};
