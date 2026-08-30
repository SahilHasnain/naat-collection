/**
 * Appwrite Configuration for React Native/Expo
 *
 * This file adapts the shared Appwrite config from the brand configuration.
 * Brand-specific values (Appwrite project, static export repo) come from
 * brand.config.js — the only file that differs between family repos.
 */

import {
    createAppwriteConfig,
    validateAppwriteConfig as validateConfig,
} from "@naat-collection/shared";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const brand = require("../brand.config.js");

// Brand-provided fallback values
const BRAND_CONFIG = {
  APPWRITE_ENDPOINT: brand.appwrite.endpoint,
  APPWRITE_PROJECT_ID: brand.appwrite.projectId,
  APPWRITE_DATABASE_ID: brand.appwrite.databaseId,
  APPWRITE_NAATS_COLLECTION_ID: brand.appwrite.naatsCollectionId,
  APPWRITE_CHANNELS_COLLECTION_ID: brand.appwrite.channelsCollectionId,
  APPWRITE_AUDIO_CACHE_COLLECTION_ID: brand.appwrite.audioCacheCollectionId,
  AUDIO_EXTRACTION_FUNCTION_URL: "",
  AUDIO_STREAMING_FUNCTION_URL: "",
  RAPIDAPI_KEY: "",
  SEMANTIC_SEARCH_FUNCTION_URL: brand.appwrite.semanticSearchFunctionUrl,
  APPWRITE_VIEW_INCREMENT_FUNCTION_URL: "",
};

export const STATIC_FALLBACK_URLS = {
  NAATS: brand.static.naatsUrl,
  CHANNELS: brand.static.channelsUrl,
};

const env = {
  APPWRITE_ENDPOINT: BRAND_CONFIG.APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID: BRAND_CONFIG.APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID: BRAND_CONFIG.APPWRITE_DATABASE_ID,
  APPWRITE_NAATS_COLLECTION_ID: BRAND_CONFIG.APPWRITE_NAATS_COLLECTION_ID,
  APPWRITE_CHANNELS_COLLECTION_ID: BRAND_CONFIG.APPWRITE_CHANNELS_COLLECTION_ID,
  APPWRITE_AUDIO_CACHE_COLLECTION_ID: BRAND_CONFIG.APPWRITE_AUDIO_CACHE_COLLECTION_ID,
  AUDIO_EXTRACTION_FUNCTION_URL: BRAND_CONFIG.AUDIO_EXTRACTION_FUNCTION_URL,
  AUDIO_STREAMING_FUNCTION_URL: BRAND_CONFIG.AUDIO_STREAMING_FUNCTION_URL,
  RAPIDAPI_KEY: BRAND_CONFIG.RAPIDAPI_KEY,
  SEMANTIC_SEARCH_FUNCTION_URL: BRAND_CONFIG.SEMANTIC_SEARCH_FUNCTION_URL,
  APPWRITE_VIEW_INCREMENT_FUNCTION_URL: BRAND_CONFIG.APPWRITE_VIEW_INCREMENT_FUNCTION_URL,
};

console.log("[DEBUG] Appwrite Config Env:", {
  semanticSearchUrl: env.SEMANTIC_SEARCH_FUNCTION_URL,
  hasSemanticSearch: !!env.SEMANTIC_SEARCH_FUNCTION_URL,
});

export const appwriteConfig = createAppwriteConfig(env);

console.log("[DEBUG] Created Appwrite Config:", {
  semanticSearchFunctionUrl: appwriteConfig.semanticSearchFunctionUrl,
  hasSemanticSearch: !!appwriteConfig.semanticSearchFunctionUrl,
});

/**
 * Validates that all required Appwrite configuration values are present
 * @throws Error if any required configuration is missing
 */
export function validateAppwriteConfig(): void {
  validateConfig(appwriteConfig);
}
