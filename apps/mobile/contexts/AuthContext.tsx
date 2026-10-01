import type { Models } from "react-native-appwrite";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { authService } from "@/services/auth";
import { favoriteSyncService } from "@/services/favoriteSync";

type AuthUser = Models.User<Models.Preferences>;

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void authService
      .getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
          void favoriteSyncService.sync(currentUser.$id).catch((error) => {
            console.warn("[Auth] Favorite sync failed:", error);
          });
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    try {
      await authService.signInWithGoogle();
      if (Platform.OS !== "web") {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        void favoriteSyncService.sync(currentUser.$id).catch((error) => {
          console.warn("[Auth] Favorite sync failed:", error);
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isSigningIn, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
