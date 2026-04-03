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

function extractSharedNaatParams(url: string): {
  naatId: string | null;
  youtubeId: string | null;
} {
  const urlObj = new URL(url);
  const youtubeId = urlObj.searchParams.get("youtubeId");

  if (urlObj.protocol === "ubaidraza:") {
    const customSchemeSegments = [urlObj.host, ...urlObj.pathname.split("/")].filter(
      Boolean,
    );

    if (customSchemeSegments[0] === "naat" && customSchemeSegments[1]) {
      return { naatId: customSchemeSegments[1], youtubeId };
    }
  }

  const webSegments = urlObj.pathname.split("/").filter(Boolean);
  if (webSegments[0] === "naat" && webSegments[1]) {
    return { naatId: webSegments[1], youtubeId };
  }

  return { naatId: null, youtubeId };
}

export function useDeepLinking() {
  const router = useRouter();
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Handle deep link when app is opened from a link
    const handleDeepLink = async (url: string) => {
      try {
        console.log("[useDeepLinking] Handling deep link:", url);

        const { naatId, youtubeId } = extractSharedNaatParams(url);

        if (naatId) {
          console.log("[useDeepLinking] Opening naat:", { naatId, youtubeId });

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
          console.log("[useDeepLinking] Unknown deep link:", url);
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
