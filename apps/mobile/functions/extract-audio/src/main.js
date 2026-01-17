/**
 * Appwrite Function: Audio Extraction Service with RapidAPI
 *
 * This function extracts direct audio stream URLs from YouTube videos using RapidAPI.
 * It uses Appwrite database caching to reduce API calls and improve performance.
 *
 * Environment Variables:
 * - APPWRITE_FUNCTION_PROJECT_ID: Appwrite project ID (auto-provided)
 * - APPWRITE_ENDPOINT: Appwrite API endpoint
 * - APPWRITE_API_KEY: Appwrite API key for database access
 * - APPWRITE_DATABASE_ID: Database ID for caching
 * - APPWRITE_AUDIO_CACHE_COLLECTION_ID: Collection ID for audio cache
 * - RAPIDAPI_KEY: RapidAPI key for YouTube API access
 * - RAPIDAPI_HOST: RapidAPI host (default: yt-api.p.rapidapi.com)
 * - CACHE_TTL_HOURS: Cache time-to-live in hours (default: 6)
 */

import { Client, Databases, ID, Query } from "node-appwrite";

// Configuration
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "yt-api.p.rapidapi.com";
const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const AUDIO_CACHE_COLLECTION_ID =
  process.env.APPWRITE_AUDIO_CACHE_COLLECTION_ID;
const CACHE_TTL_MS =
  (parseInt(process.env.CACHE_TTL_HOURS) || 6) * 60 * 60 * 1000;
const API_TIMEOUT_MS = 15000;

// Appwrite client
let databases = null;

/**
 * Initialize Appwrite client
 */
function initializeAppwrite(log) {
  if (databases) return;

  if (!APPWRITE_API_KEY || !DATABASE_ID || !AUDIO_CACHE_COLLECTION_ID) {
    log("⚠️ Appwrite configuration incomplete - caching disabled");
    return;
  }

  try {
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    databases = new Databases(client);
    log("✓ Appwrite client initialized");
  } catch (err) {
    log(`❌ Failed to initialize Appwrite: ${err.message}`);
  }
}

/**
 * Validate YouTube ID format
 */
function isValidYouTubeId(youtubeId) {
  if (!youtubeId || typeof youtubeId !== "string") return false;
  return /^[a-zA-Z0-9_-]{11}$/.test(youtubeId);
}

/**
 * Check cache for existing audio URL
 */
async function getCachedAudioUrl(youtubeId, log) {
  if (!databases) return null;

  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      AUDIO_CACHE_COLLECTION_ID,
      [Query.equal("youtubeId", youtubeId), Query.limit(1)]
    );

    if (response.documents.length === 0) {
      log(`Cache miss for ${youtubeId}`);
      return null;
    }

    const cached = response.documents[0];
    const expiresAt = new Date(cached.expiresAt).getTime();

    // Check if expired
    if (Date.now() >= expiresAt) {
      log(`Cache expired for ${youtubeId}`);
      // Delete expired entry
      await databases.deleteDocument(
        DATABASE_ID,
        AUDIO_CACHE_COLLECTION_ID,
        cached.$id
      );
      return null;
    }

    log(`Cache hit for ${youtubeId} (expires: ${cached.expiresAt})`);
    return {
      audioUrl: cached.audioUrl,
      expiresAt: expiresAt,
      quality: cached.quality,
      format: "m4a",
      cached: true,
    };
  } catch (err) {
    log(`Cache check error: ${err.message}`);
    return null;
  }
}

/**
 * Save audio URL to cache
 */
async function saveToCache(youtubeId, audioUrl, quality, title, duration, log) {
  if (!databases) return;

  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
    const fetchedAt = new Date().toISOString();

    // Try to update existing document first
    const existing = await databases.listDocuments(
      DATABASE_ID,
      AUDIO_CACHE_COLLECTION_ID,
      [Query.equal("youtubeId", youtubeId), Query.limit(1)]
    );

    if (existing.documents.length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        AUDIO_CACHE_COLLECTION_ID,
        existing.documents[0].$id,
        {
          audioUrl,
          expiresAt,
          quality,
          fetchedAt,
          title,
          duration,
        }
      );
      log(`Updated cache for ${youtubeId}`);
    } else {
      await databases.createDocument(
        DATABASE_ID,
        AUDIO_CACHE_COLLECTION_ID,
        ID.unique(),
        {
          youtubeId,
          audioUrl,
          expiresAt,
          quality,
          fetchedAt,
          title,
          duration,
        }
      );
      log(`Cached new entry for ${youtubeId}`);
    }
  } catch (err) {
    log(`Cache save error: ${err.message}`);
  }
}

/**
 * Extract audio URL from RapidAPI
 */
async function extractAudioFromRapidAPI(youtubeId, log, logError) {
  if (!RAPIDAPI_KEY) {
    throw {
      code: "RAPIDAPI_KEY_MISSING",
      message: "RapidAPI key is not configured",
    };
  }

  const url = `https://${RAPIDAPI_HOST}/dl?id=${youtubeId}`;

  log(`Calling RapidAPI: ${url}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`RapidAPI returned status ${response.status}`);
    }

    const result = await response.json();
    log(`RapidAPI response received`);

    // Extract audio URL from response
    // Adjust based on actual RapidAPI response structure
    const audioUrl =
      result.adaptiveFormats?.find((f) => f.mimeType?.includes("audio"))?.url ||
      result.formats?.find((f) => f.mimeType?.includes("audio"))?.url;

    if (!audioUrl) {
      log(
        `RapidAPI response structure: ${JSON.stringify(Object.keys(result))}`
      );
      throw new Error("No audio URL found in RapidAPI response");
    }

    log(`Extracted audio URL (first 100 chars): ${audioUrl.substring(0, 100)}`);

    return {
      audioUrl,
      quality: result.audioQuality || "128kbps",
      title: result.title || null,
      duration: result.lengthSeconds ? parseInt(result.lengthSeconds, 10) : 0,
    };
  } catch (err) {
    if (err.name === "AbortError") {
      logError("RapidAPI request timeout");
      throw {
        code: "TIMEOUT",
        message: "RapidAPI request timed out",
      };
    }

    logError(`RapidAPI error: ${err.message}`);
    throw {
      code: "RAPIDAPI_ERROR",
      message: `Failed to extract audio: ${err.message}`,
    };
  }
}

/**
 * Main function handler
 */
export default async ({ req, res, log, error: logError }) => {
  try {
    log("Audio extraction request received");

    // Initialize Appwrite
    initializeAppwrite(log);

    // Parse request body
    let requestBody;
    try {
      requestBody =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (err) {
      return res.json(
        {
          success: false,
          error: "Invalid JSON in request body",
          code: "INVALID_REQUEST",
        },
        400
      );
    }

    const { youtubeId } = requestBody;

    // Validate YouTube ID
    if (!isValidYouTubeId(youtubeId)) {
      return res.json(
        {
          success: false,
          error: "Invalid YouTube ID format",
          code: "INVALID_ID",
        },
        400
      );
    }

    log(`Processing: ${youtubeId}`);

    // Check cache first
    const cached = await getCachedAudioUrl(youtubeId, log);
    if (cached) {
      return res.json(
        {
          success: true,
          ...cached,
        },
        200
      );
    }

    // Extract from RapidAPI
    const extracted = await extractAudioFromRapidAPI(youtubeId, log, logError);

    // Save to cache
    await saveToCache(
      youtubeId,
      extracted.audioUrl,
      extracted.quality,
      extracted.title,
      extracted.duration,
      log
    );

    // Calculate expiry
    const expiresAt = Date.now() + CACHE_TTL_MS;

    return res.json(
      {
        success: true,
        audioUrl: extracted.audioUrl,
        expiresAt,
        quality: extracted.quality,
        format: "m4a",
        cached: false,
      },
      200
    );
  } catch (err) {
    // Handle structured errors
    if (err.code && err.message) {
      logError(`Error [${err.code}]: ${err.message}`);

      const statusCode =
        err.code === "INVALID_ID"
          ? 400
          : err.code === "RAPIDAPI_KEY_MISSING"
            ? 503
            : err.code === "TIMEOUT"
              ? 504
              : err.code === "RAPIDAPI_ERROR"
                ? 502
                : 500;

      return res.json(
        {
          success: false,
          error: err.message,
          code: err.code,
        },
        statusCode
      );
    }

    // Unexpected errors
    logError(`Unexpected error: ${err.message}`);
    logError(err.stack);

    return res.json(
      {
        success: false,
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
      500
    );
  }
};
