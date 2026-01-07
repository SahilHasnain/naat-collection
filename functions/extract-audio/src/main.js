/**
 * Appwrite Function: Audio Extraction Service
 *
 * This function extracts direct audio stream URLs from YouTube videos using youtube-dl-exec.
 * It provides on-demand audio URL extraction with in-memory caching to reduce
 * redundant extractions and improve performance.
 *
 * Environment Variables:
 * - APPWRITE_FUNCTION_PROJECT_ID: Appwrite project ID (auto-provided)
 * - APPWRITE_ENDPOINT: Appwrite API endpoint (default: https://cloud.appwrite.io/v1)
 * - CACHE_TTL_HOURS: Cache time-to-live in hours (default: 5)
 * - YOUTUBE_COOKIES: Base64-encoded Netscape cookies.txt content (optional but recommended)
 *
 * Request Body:
 * {
 *   "youtubeId": "string" // YouTube video ID (11 characters)
 * }
 *
 * Response (Success):
 * {
 *   "success": true,
 *   "audioUrl": "string",
 *   "expiresAt": number,
 *   "format": "string",
 *   "quality": "string"
 * }
 *
 * Response (Error):
 * {
 *   "success": false,
 *   "error": "string",
 *   "code": "string"
 * }
 */

import { Buffer } from "buffer";
import { existsSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import youtubedl from "youtube-dl-exec";

// In-memory cache for audio URLs
const audioUrlCache = new Map();

// Cache TTL in milliseconds (default: 5 hours)
const CACHE_TTL_MS =
  (parseInt(process.env.CACHE_TTL_HOURS) || 5) * 60 * 60 * 1000;

// Extraction timeout in milliseconds
const EXTRACTION_TIMEOUT_MS = 15000; // Increased to 15s for cookie-based requests

// Cookie file path (temporary)
let cookieFilePath = null;

/**
 * Initializes cookie file from environment variable
 * @param {Function} log - Logging function
 */
function initializeCookies(log) {
  if (cookieFilePath) {
    log(`Cookies already initialized at: ${cookieFilePath}`);
    return; // Already initialized
  }

  const cookiesBase64 = process.env.YOUTUBE_COOKIES;
  if (!cookiesBase64) {
    log(
      "⚠️ No YOUTUBE_COOKIES environment variable found - running without cookies"
    );
    log("This will likely trigger YouTube bot detection!");
    return;
  }

  log(`Found YOUTUBE_COOKIES env var (length: ${cookiesBase64.length})`);

  try {
    // Decode base64 cookies
    const cookiesContent = Buffer.from(cookiesBase64, "base64").toString(
      "utf-8"
    );

    log(`Decoded cookies content (length: ${cookiesContent.length} bytes)`);
    log(`Cookie content preview: ${cookiesContent.substring(0, 100)}...`);

    // Create temporary cookie file
    cookieFilePath = join(tmpdir(), `yt-cookies-${Date.now()}.txt`);
    writeFileSync(cookieFilePath, cookiesContent, "utf-8");

    log(`✓ Initialized cookie file at: ${cookieFilePath}`);
  } catch (err) {
    log(`❌ Failed to initialize cookies: ${err.message}`);
    log(`Error stack: ${err.stack}`);
    cookieFilePath = null;
  }
}

/**
 * Cleans up cookie file
 */

/**
 * Validates YouTube video ID format
 * @param {string} youtubeId - YouTube video ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidYouTubeId(youtubeId) {
  if (!youtubeId || typeof youtubeId !== "string") {
    return false;
  }

  // YouTube IDs are 11 characters: alphanumeric, underscore, or hyphen
  const youtubeIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  return youtubeIdRegex.test(youtubeId);
}

/**
 * Extracts audio stream URL from YouTube using youtube-dl-exec
 * @param {string} youtubeId - YouTube video ID
 * @param {Function} log - Logging function
 * @param {Function} logError - Error logging function
 * @returns {Promise<Object>} Audio extraction result
 */
async function extractAudioUrl(youtubeId, log, logError) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

  log(`Extracting audio URL for: ${youtubeUrl}`);

  try {
    // Build youtube-dl-exec options
    const options = {
      getUrl: true,
      format: "bestaudio",
      noCheckCertificates: true,
      noWarnings: false, // Enable warnings for debugging
      verbose: true, // Enable verbose output
      // Add user agent to mimic browser
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    // Add cookies if available
    if (cookieFilePath) {
      // Verify cookie file exists
      if (existsSync(cookieFilePath)) {
        options.cookies = cookieFilePath;
        log(`✓ Using cookie authentication from: ${cookieFilePath}`);
      } else {
        log(`❌ Cookie file does not exist at: ${cookieFilePath}`);
        log("⚠️ Proceeding without cookies - may encounter bot detection");
      }
    } else {
      log("⚠️ No cookies available - may encounter bot detection");
    }

    log(
      `Calling youtube-dl-exec with options: ${JSON.stringify({ ...options, cookies: cookieFilePath ? "[REDACTED]" : undefined })}`
    );

    // Execute youtube-dl-exec with timeout
    const result = await Promise.race([
      youtubedl(youtubeUrl, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), EXTRACTION_TIMEOUT_MS)
      ),
    ]);

    log(`youtube-dl-exec returned result type: ${typeof result}`);

    // The result should be the direct URL
    const audioUrl =
      typeof result === "string" ? result.trim() : result.url?.trim();

    if (!audioUrl || !audioUrl.startsWith("http")) {
      throw new Error("Invalid audio URL returned from youtube-dl-exec");
    }

    log(`Successfully extracted audio URL (length: ${audioUrl.length})`);

    // Extract format and quality information from URL
    // YouTube URLs typically contain format info in query parameters
    const urlObj = new URL(audioUrl);
    const mime = urlObj.searchParams.get("mime") || "";
    const format = mime.includes("audio/mp4")
      ? "m4a"
      : mime.includes("audio/webm")
        ? "opus"
        : "unknown";

    // Estimate quality from URL parameters or default to 128kbps
    const quality = "128kbps"; // YouTube typically serves audio at this quality

    return {
      success: true,
      audioUrl,
      format,
      quality,
    };
  } catch (err) {
    // Log full error details for debugging
    logError(`❌ Extraction error caught: ${err.message}`);
    logError(`Error type: ${err.constructor.name}`);
    logError(`Error stack: ${err.stack}`);

    // Log stderr if available (youtube-dl-exec specific)
    if (err.stderr) {
      logError(`youtube-dl-exec stderr: ${err.stderr}`);
    }

    // Handle specific error types
    if (err.message === "TIMEOUT") {
      logError(
        `youtube-dl-exec extraction timeout after ${EXTRACTION_TIMEOUT_MS}ms`
      );
      throw {
        code: "TIMEOUT",
        message: `Audio extraction timed out after ${EXTRACTION_TIMEOUT_MS / 1000} seconds`,
      };
    }

    if (err.message && err.message.includes("not found")) {
      logError("youtube-dl-exec not found or failed to initialize");
      throw {
        code: "YTDLP_NOT_FOUND",
        message: "youtube-dl-exec is not available or failed to initialize",
      };
    }

    // Bot detection error
    if (err.message && err.message.includes("Sign in to confirm")) {
      logError(`YouTube bot detection triggered: ${err.message}`);
      logError(`Cookie file was: ${cookieFilePath || "NOT SET"}`);
      throw {
        code: "BOT_DETECTED",
        message:
          "YouTube bot detection triggered. Please configure YOUTUBE_COOKIES environment variable.",
      };
    }

    // Network or YouTube API errors
    if (
      err.message &&
      (err.message.includes("ERROR") || err.message.includes("unavailable"))
    ) {
      logError(`YouTube error: ${err.message}`);
      throw {
        code: "NETWORK_ERROR",
        message:
          "Failed to access YouTube video. Video may be unavailable or private.",
      };
    }

    // Generic extraction failure
    logError(`youtube-dl-exec extraction failed: ${err.message}`);
    throw {
      code: "EXTRACTION_FAILED",
      message: `Failed to extract audio URL: ${err.message}`,
    };
  }
}

/**
 * Generates cache key from YouTube ID
 * @param {string} youtubeId - YouTube video ID
 * @returns {string} Cache key
 */
function getCacheKey(youtubeId) {
  return `audio_url_${youtubeId}`;
}

/**
 * Checks if cached entry is still valid
 * @param {Object} cacheEntry - Cache entry to check
 * @returns {boolean} True if valid, false if expired
 */
function isCacheValid(cacheEntry) {
  if (!cacheEntry || !cacheEntry.expiresAt) {
    return false;
  }
  return Date.now() < cacheEntry.expiresAt;
}

/**
 * Gets audio URL from cache or extracts it
 * @param {string} youtubeId - YouTube video ID
 * @param {Function} log - Logging function
 * @param {Function} logError - Error logging function
 * @returns {Promise<Object>} Audio URL response
 */
async function getAudioUrl(youtubeId, log, logError) {
  const cacheKey = getCacheKey(youtubeId);

  // Check cache first
  const cachedEntry = audioUrlCache.get(cacheKey);

  if (cachedEntry && isCacheValid(cachedEntry)) {
    log(
      `Cache hit for ${youtubeId} (expires at ${new Date(cachedEntry.expiresAt).toISOString()})`
    );
    return {
      success: true,
      audioUrl: cachedEntry.audioUrl,
      expiresAt: cachedEntry.expiresAt,
      format: cachedEntry.format,
      quality: cachedEntry.quality,
      cached: true,
    };
  }

  if (cachedEntry) {
    log(`Cache expired for ${youtubeId}, extracting fresh URL`);
    audioUrlCache.delete(cacheKey);
  } else {
    log(`Cache miss for ${youtubeId}, extracting URL`);
  }

  // Extract fresh audio URL
  const extractionResult = await extractAudioUrl(youtubeId, log, logError);

  // Calculate expiration time (current time + TTL)
  const expiresAt = Date.now() + CACHE_TTL_MS;

  // Store in cache
  const cacheEntry = {
    audioUrl: extractionResult.audioUrl,
    expiresAt,
    format: extractionResult.format,
    quality: extractionResult.quality,
    cachedAt: Date.now(),
  };

  audioUrlCache.set(cacheKey, cacheEntry);
  log(
    `Cached audio URL for ${youtubeId} (expires at ${new Date(expiresAt).toISOString()})`
  );

  return {
    success: true,
    audioUrl: extractionResult.audioUrl,
    expiresAt,
    format: extractionResult.format,
    quality: extractionResult.quality,
    cached: false,
  };
}

/**
 * Main function handler
 * @param {Object} context - Appwrite function context
 * @returns {Object} Response object
 */
export default async ({ req, res, log, error: logError }) => {
  try {
    log("Audio extraction request received");

    // Initialize cookies on first request
    initializeCookies(log);

    // Parse request body
    let requestBody;
    try {
      requestBody =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (err) {
      logError(`Invalid JSON in request body: ${err.message}`);
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
      logError(`Invalid YouTube ID: ${youtubeId}`);
      return res.json(
        {
          success: false,
          error:
            "Invalid YouTube ID format. Expected 11 alphanumeric characters.",
          code: "INVALID_ID",
        },
        400
      );
    }

    log(`Processing audio extraction for YouTube ID: ${youtubeId}`);

    // Get audio URL (from cache or extract)
    try {
      const result = await getAudioUrl(youtubeId, log, logError);
      return res.json(result, 200);
    } catch (err) {
      // Handle structured errors from extraction
      if (err.code && err.message) {
        logError(`Audio extraction error [${err.code}]: ${err.message}`);

        // Map error codes to HTTP status codes
        const statusCode =
          err.code === "INVALID_ID"
            ? 400
            : err.code === "YTDLP_NOT_FOUND"
              ? 503
              : err.code === "TIMEOUT"
                ? 504
                : err.code === "NETWORK_ERROR"
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

      // Handle unexpected errors
      throw err;
    }
  } catch (err) {
    const errorMsg = `Unexpected error during audio extraction: ${err.message}`;
    logError(errorMsg);
    logError(err.stack);

    return res.json(
      {
        success: false,
        error: "An unexpected error occurred during audio extraction",
        code: "INTERNAL_ERROR",
      },
      500
    );
  }
};
