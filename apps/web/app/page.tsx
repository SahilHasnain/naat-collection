import { HomeClient } from "@/components/HomeClient";
import { appwriteService } from "@/lib/appwrite";
import type { Channel } from "@naat-collection/shared";

// Revalidate channels every 5 minutes (300 seconds)
export const revalidate = 300;

/**
 * Server Component - Pre-fetches channels for faster initial load
 * This eliminates the loading state for channels on client
 * Channels are cached and revalidated every 5 minutes
 */
export default async function Home() {
  // Pre-fetch channels on server for instant display
  let channels: Channel[] = [];
  try {
    channels = await appwriteService.getChannels();
  } catch (error) {
    console.error("Error pre-fetching channels:", error);
    // Continue with empty channels - client will handle gracefully
  }

  return <HomeClient initialChannels={channels} />;
}
