/**
 * Appwrite Function: Audio Streaming Proxy
 *
 * This function proxies YouTube audio streams to avoid CORS and 403 errors.
 * It fetches the audio from the cached URL and streams it to the client.
 *
 * Environment Variables:
 * - APPWRITE_ENDPOINT: Appwrite API endpoint
 * - APPWRITE_API_KEY: Appwrite API key for database access
 * - APPWRITE_DATABASE_ID: Database ID for caching
 * - APPWRITE_AUDIO_CACHE_COLLECTION_ID: Collection ID for audio cache
 */

import { Client, Databases, Query } from "node-appwrite";

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const AUDIO_CACHE_COLLECTION_ID =
  process.env.APPWRITE_AUDIO_CACHE_COLLECTION_ID;

let databases = null;

/**
 * Initialize Appwrite client
 */
function initializeAppwrite() {
  if (databases) return;

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  databases = new Databases(client);
}

/**
 * Get audio URL from cache
 */
async function getAudioUrlFromCache(youtubeId) {
  const response = await databases.listDocuments(
    DATABASE_ID,
    AUDIO_CACHE_COLLECTION_ID,
    [Query.equal("youtubeId", youtubeId), Query.limit(1)]
  );

  if (response.documents.length === 0) {
    return null;
  }

  const cached = response.documents[0];
  const expiresAt = new Date(cached.expiresAt).getTime();

  // Check if expired
  if (Date.now() >= expiresAt) {
    return null;
  }

  return cached.audioUrl;
}

/**
 * Main function handler
 */
export default async ({ req, res, log, error: logError }) => {
  try {
    // Get YouTube ID from query parameter
    const youtubeId = req.query.youtubeId || req.query.id;

    if (!youtubeId) {
      return res.send("Missing youtubeId parameter", 400);
    }

    log(`Streaming audio for: ${youtubeId}`);

    // Initialize Appwrite
    initializeAppwrite();

    // Get audio URL from cache
    const audioUrl = await getAudioUrlFromCache(youtubeId);

    if (!audioUrl) {
      return res.send(
        "Audio URL not found or expired. Please extract first.",
        404
      );
    }

    log(`Fetching audio from: ${audioUrl.substring(0, 100)}...`);

    // Fetch the audio with proper headers
    const audioResponse = await fetch(audioUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Range: req.headers.range || "bytes=0-",
      },
    });

    if (!audioResponse.ok) {
      logError(`Failed to fetch audio: ${audioResponse.status}`);
      return res.send(
        `Failed to fetch audio: ${audioResponse.statusText}`,
        audioResponse.status
      );
    }

    // Get content type and length
    const contentType =
      audioResponse.headers.get("content-type") || "audio/mp4";
    const contentLength = audioResponse.headers.get("content-length");
    const contentRange = audioResponse.headers.get("content-range");

    log(`Streaming ${contentType}, length: ${contentLength}`);

    // Set response headers
    const responseHeaders = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    };

    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange;
    }

    // Stream the audio
    const statusCode = audioResponse.status === 206 ? 206 : 200;

    return res.send(audioResponse.body, statusCode, responseHeaders);
  } catch (err) {
    logError(`Error: ${err.message}`);
    return res.send("Internal server error", 500);
  }
};
