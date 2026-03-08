/**
 * Cleanup Stale Listeners Function
 *
 * Removes listener documents that haven't sent a heartbeat in 5+ minutes
 * This prevents the collection from growing indefinitely
 * 
 * Should be triggered every 5-10 minutes
 */

import { Client, Databases, Query } from "node-appwrite";

const LISTENERS_COLLECTION_ID = "live_radio_listeners";
const STALE_THRESHOLD = 300000; // 5 minutes in milliseconds

export default async ({ req, res, log, error }) => {
  try {
    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const databaseId = process.env.APPWRITE_DATABASE_ID;

    log("Cleaning up stale listeners...");

    // Calculate cutoff time (5 minutes ago)
    const cutoffTime = new Date(Date.now() - STALE_THRESHOLD).toISOString();

    // Query for stale listeners
    const staleListeners = await databases.listDocuments(
      databaseId,
      LISTENERS_COLLECTION_ID,
      [
        Query.lessThan('lastHeartbeat', cutoffTime),
        Query.limit(100), // Process in batches
      ]
    );

    if (staleListeners.documents.length === 0) {
      log("No stale listeners found");
      return res.json({
        success: true,
        message: "No stale listeners to clean up",
        removed: 0,
      });
    }

    // Delete stale listeners
    let removed = 0;
    for (const listener of staleListeners.documents) {
      try {
        await databases.deleteDocument(
          databaseId,
          LISTENERS_COLLECTION_ID,
          listener.$id
        );
        removed++;
      } catch (err) {
        error(`Error deleting listener ${listener.$id}:`, err);
      }
    }

    log(`Removed ${removed} stale listeners`);

    return res.json({
      success: true,
      message: `Cleaned up ${removed} stale listeners`,
      removed,
    });
  } catch (err) {
    error("Error in cleanup function:", err);
    return res.json(
      {
        success: false,
        error: err.message,
      },
      500,
    );
  }
};
