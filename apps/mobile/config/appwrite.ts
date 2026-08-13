/**
 * Appwrite Configuration for React Native/Expo
 *
 * This file adapts the shared Appwrite config for Expo's environment variables.
 * Environment variables must be prefixed with EXPO_PUBLIC_ to be accessible.
 *
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
const FALLBACK_CONFIG = {
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
  NAATS: process.env.EXPO_PUBLIC_STATIC_NAATS_URL || brand.static.naatsUrl,
  CHANNELS: process.env.EXPO_PUBLIC_STATIC_CHANNELS_URL || brand.static.channelsUrl,
};

// Map Expo environment variables to shared config format with fallbacks
const env = {
  APPWRITE_ENDPOINT: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || FALLBACK_CONFIG.APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || FALLBACK_CONFIG.APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || FALLBACK_CONFIG.APPWRITE_DATABASE_ID,
  APPWRITE_NAATS_COLLECTION_ID:
    process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID || FALLBACK_CONFIG.APPWRITE_NAATS_COLLECTION_ID,
  APPWRITE_CHANNELS_COLLECTION_ID:
    process.env.EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID || FALLBACK_CONFIG.APPWRITE_CHANNELS_COLLECTION_ID,
  APPWRITE_AUDIO_CACHE_COLLECTION_ID:
    process.env.EXPO_PUBLIC_APPWRITE_AUDIO_CACHE_COLLECTION_ID || FALLBACK_CONFIG.APPWRITE_AUDIO_CACHE_COLLECTION_ID,
  AUDIO_EXTRACTION_FUNCTION_URL:
    process.env.EXPO_PUBLIC_AUDIO_EXTRACTION_FUNCTION_URL || FALLBACK_CONFIG.AUDIO_EXTRACTION_FUNCTION_URL,
  AUDIO_STREAMING_FUNCTION_URL:
    process.env.EXPO_PUBLIC_AUDIO_STREAMING_FUNCTION_URL || FALLBACK_CONFIG.AUDIO_STREAMING_FUNCTION_URL,
  RAPIDAPI_KEY: process.env.EXPO_PUBLIC_RAPIDAPI_KEY || FALLBACK_CONFIG.RAPIDAPI_KEY,
  SEMANTIC_SEARCH_FUNCTION_URL:
    process.env.EXPO_PUBLIC_SEMANTIC_SEARCH_FUNCTION_URL || FALLBACK_CONFIG.SEMANTIC_SEARCH_FUNCTION_URL,
  APPWRITE_VIEW_INCREMENT_FUNCTION_URL:
    process.env.EXPO_PUBLIC_APPWRITE_VIEW_INCREMENT_FUNCTION_URL || FALLBACK_CONFIG.APPWRITE_VIEW_INCREMENT_FUNCTION_URL,
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
