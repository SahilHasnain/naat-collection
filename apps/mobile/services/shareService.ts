/**
 * Share Service for React Native
 * 
 * Handles sharing naats via native share functionality
 * Uses YouTube links (always clickable) with app promotion
 */

import { showErrorToast, showSuccessToast } from "@/utils/toast";
import type { Naat } from "@naat-collection/shared";
import * as Sentry from "@sentry/react-native";
import { Platform, Share } from "react-native";

export interface ShareOptions {
  customMessage?: string;
}

// Deep link scheme for the app
const APP_SCHEME = "ubaidraza";
const SHARE_BASE_URL = "https://owaisrazaqadri.appwrite.network";

/**
 * Generate a deep link URL that opens in the app
 * Format: ubaidraza://naat/{naatId}?youtubeId={youtubeId}
 */
function generateDeepLink(naatId: string, youtubeId: string): string {
  return `${APP_SCHEME}://naat/${naatId}?youtubeId=${youtubeId}`;
}

function generateShareUrl(naatId: string, youtubeId?: string): string {
  const search = youtubeId ? `?youtubeId=${encodeURIComponent(youtubeId)}` : "";
  return `${SHARE_BASE_URL}/naat/${naatId}${search}`;
}

/**
 * Share a naat using native share functionality
 * Uses web URL that redirects to app or YouTube
 */
export async function shareNaat(
  naat: Naat,
  options: ShareOptions = {}
): Promise<boolean> {
  const {
    customMessage,
  } = options;

  try {
    // Simple message with just title and link
    let message = customMessage || `🎵 ${naat.title}`;

    // Use web URL that will redirect to app if installed, YouTube if not
    const webUrl = generateShareUrl(naat.$id, naat.youtubeId);
    message += `\n\n${webUrl}`;

    // Share content
    const result = await Share.share(
      {
        message,
        url: Platform.OS === "ios" ? webUrl : undefined,
        title: naat.title,
      },
      {
        dialogTitle: `Share ${naat.title}`,
        subject: naat.title,
      }
    );

    // Handle result
    if (result.action === Share.sharedAction) {
      if (result.activityType) {
        Sentry.addBreadcrumb({
          category: "share",
          message: `Naat shared via ${result.activityType}`,
          level: "info",
          data: { naatId: naat.$id, title: naat.title },
        });
      } else {
        Sentry.addBreadcrumb({
          category: "share",
          message: "Naat shared",
          level: "info",
          data: { naatId: naat.$id, title: naat.title },
        });
      }
      showSuccessToast("Shared successfully");
      return true;
    } else if (result.action === Share.dismissedAction) {
      return false;
    }

    return false;
  } catch (error) {
    console.error("[shareService] Error sharing naat:", error);
    Sentry.captureException(error, {
      tags: { component: "share" },
      contexts: {
        naat: {
          id: naat.$id,
          title: naat.title,
        },
      },
    });
    showErrorToast("Failed to share");
    return false;
  }
}

/**
 * Share currently playing audio
 */
export async function shareCurrentAudio(
  title: string,
  channelName: string,
  youtubeId?: string,
  naatId?: string
): Promise<boolean> {
  try {
    let message = `🎵 ${title}`;

      if (naatId && youtubeId) {
      const webUrl = generateShareUrl(naatId, youtubeId);
      message += `\n\n${webUrl}`;
    } else if (youtubeId) {
      const youtubeUrl = `https://youtu.be/${youtubeId}`;
      message += `\n\n${youtubeUrl}`;
    }

    const result = await Share.share(
      {
        message,
        url: Platform.OS === "ios" && naatId && youtubeId
          ? generateShareUrl(naatId, youtubeId)
          : Platform.OS === "ios" && youtubeId
          ? `https://youtu.be/${youtubeId}`
          : undefined,
        title,
      },
      {
        dialogTitle: `Share ${title}`,
        subject: title,
      }
    );

    if (result.action === Share.sharedAction) {
      showSuccessToast("Shared successfully");
      return true;
    }

    return false;
  } catch (error) {
    console.error("[shareService] Error sharing current audio:", error);
    Sentry.captureException(error, {
      tags: { component: "share" },
    });
    showErrorToast("Failed to share");
    return false;
  }
}

export const shareService = {
  shareNaat,
  shareCurrentAudio,
  generateDeepLink,
  generateShareUrl,
};
