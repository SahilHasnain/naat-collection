import type { Models } from "react-native-appwrite";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { authService } from "@/services/auth";
import { cloudSyncService } from "@/services/cloudSync";

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
          cloudSyncService.setCloudSyncUser(currentUser.$id);
          void cloudSyncService.flushCloudSync(currentUser.$id).catch((error) => {
            console.warn("[Auth] Cloud sync failed:", error);
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
        cloudSyncService.setCloudSyncUser(currentUser.$id);
        void cloudSyncService.flushCloudSync(currentUser.$id).catch((error) => {
          console.warn("[Auth] Cloud sync failed:", error);
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    try {
      if (user?.$id) {
        cloudSyncService.setCloudSyncUser(user.$id);
        try {
          await cloudSyncService.flushCloudSync(user.$id);
        } catch (error) {
          console.warn("[Auth] Cloud sync before sign-out failed:", error);
        }
      }
      await authService.signOut();
    } finally {
      cloudSyncService.setCloudSyncUser(null);
      setUser(null);
    }
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
