/**
 * Deep Linking Hook
 * 
 * Handles incoming deep links to open naats in the app
 * Format: ubaidraza://naat/{naatId}?youtubeId={youtubeId}
 */

import { showErrorToast } from "@/utils/toast";
import * as Sentry from "@sentry/react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Linking } from "react-native";

export function useDeepLinking() {
  const router = useRouter();
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Handle deep link when app is opened from a link
    const handleDeepLink = async (url: string) => {
      try {
        console.log("[useDeepLinking] Handling deep link:", url);

        // Parse the URL
        // Format: ubaidraza://naat/{naatId}?youtubeId={youtubeId}
        const urlObj = new URL(url);
        
        if (urlObj.protocol !== "ubaidraza:") {
          console.log("[useDeepLinking] Invalid protocol:", urlObj.protocol);
          return;
        }

        // Extract path segments
        const pathSegments = urlObj.pathname.split("/").filter(Boolean);
        
        if (pathSegments[0] === "naat" && pathSegments[1]) {
          const naatId = pathSegments[1];
          const youtubeId = urlObj.searchParams.get("youtubeId");

          console.log("[useDeepLinking] Opening naat:", { naatId, youtubeId });

          // Navigate to home and trigger playback
          // The home screen will handle loading and playing the naat
          router.push({
            pathname: "/home",
            params: {
              autoPlayNaatId: naatId,
              youtubeId: youtubeId || "",
            },
          });

          Sentry.addBreadcrumb({
            category: "deep-link",
            message: "Opened naat from deep link",
            level: "info",
            data: { naatId, youtubeId },
          });
        } else {
          console.log("[useDeepLinking] Unknown deep link path:", pathSegments);
        }
      } catch (error) {
        console.error("[useDeepLinking] Error handling deep link:", error);
        Sentry.captureException(error, {
          tags: { component: "deep-link" },
          contexts: {
            url: { url },
          },
        });
        showErrorToast("Failed to open link");
      }
    };

    // Check if app was opened with a deep link
    const checkInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log("[useDeepLinking] App opened with URL:", initialUrl);
          await handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error("[useDeepLinking] Error getting initial URL:", error);
      }
    };

    // Only check initial URL on mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      checkInitialURL();
    }

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[useDeepLinking] Received URL event:", event.url);
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);
}
