/**
 * Appwrite Function: Increment Naat App View
 *
 * Increments the `appView` field on a naat document whenever a user plays
 * that naat inside the app. Keeps in-app watch counts separate from the
 * YouTube `views` field.
 *
 * Environment Variables Required:
 * - APPWRITE_ENDPOINT (or APPWRITE_FUNCTION_API_ENDPOINT)
 * - APPWRITE_PROJECT_ID (or APPWRITE_FUNCTION_PROJECT_ID)
 * - APPWRITE_API_KEY — server key with write access to the naats collection
 * - APPWRITE_DATABASE_ID
 * - APPWRITE_NAATS_COLLECTION_ID
 */

import { Client, Databases } from "node-appwrite";

/**
 * Main function handler
 * @param {Object} context - Appwrite function context
 * @returns {Object} Response object
 */
export default async ({ req, res, log, error: logError }) => {
  try {
    // Parse request body
    const body = req.bodyJson || JSON.parse(req.body || "{}");
    const naatId = body.naatId || req.query.naatId;

    if (!naatId || typeof naatId !== "string") {
      return res.json(
        {
          success: false,
          error: "Missing naatId",
        },
        400
      );
    }

    const endpoint =
      process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT || "";
    const projectId =
      process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || "";
    const apiKey = process.env.APPWRITE_API_KEY || "";
    const databaseId = process.env.APPWRITE_DATABASE_ID || "";
    const collectionId = process.env.APPWRITE_NAATS_COLLECTION_ID || "";

    if (!endpoint || !projectId || !apiKey || !databaseId || !collectionId) {
      const errorMsg =
        "Missing required environment variables: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID, or APPWRITE_NAATS_COLLECTION_ID";
      logError(errorMsg);
      return res.json(
        {
          success: false,
          error: errorMsg,
        },
        500
      );
    }

    // Initialize server SDK
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    // Read current document to get the existing appView value
    const doc = await databases.getDocument(databaseId, collectionId, naatId);

    const currentAppView = Number(doc.appView || 0);
    const nextAppView = currentAppView + 1;

    // Update with the incremented value
    await databases.updateDocument(databaseId, collectionId, naatId, {
      appView: nextAppView,
    });

    log(`Incremented appView for naat "${naatId}": ${currentAppView} -> ${nextAppView}`);

    return res.json({
      success: true,
      naatId,
      appView: nextAppView,
    });
  } catch (err) {
    const errorMsg = `Error incrementing appView: ${err.message}`;
    logError(errorMsg);

    return res.json(
      {
        success: false,
        error: errorMsg,
      },
      500
    );
  }
};
