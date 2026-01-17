/**
 * Appwrite Configuration for React Native/Expo
 *
 * This file adapts the shared Appwrite config for Expo's environment variables.
 * Environment variables must be prefixed with EXPO_PUBLIC_ to be accessible.
 */

import {
  createAppwriteConfig,
  validateAppwriteConfig as validateConfig,
} from "@naat-collection/shared";

// Map Expo environment variables to shared config format
const env = {
  APPWRITE_ENDPOINT: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  APPWRITE_NAATS_COLLECTION_ID:
    process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID,
  APPWRITE_CHANNELS_COLLECTION_ID:
    process.env.EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID,
  APPWRITE_AUDIO_CACHE_COLLECTION_ID:
    process.env.EXPO_PUBLIC_APPWRITE_AUDIO_CACHE_COLLECTION_ID,
  AUDIO_EXTRACTION_FUNCTION_URL:
    process.env.EXPO_PUBLIC_AUDIO_EXTRACTION_FUNCTION_URL,
  AUDIO_STREAMING_FUNCTION_URL:
    process.env.EXPO_PUBLIC_AUDIO_STREAMING_FUNCTION_URL,
  RAPIDAPI_KEY: process.env.EXPO_PUBLIC_RAPIDAPI_KEY,
};

export const appwriteConfig = createAppwriteConfig(env);

/**
 * Validates that all required Appwrite configuration values are present
 * @throws Error if any required configuration is missing
 */
export function validateAppwriteConfig(): void {
  validateConfig(appwriteConfig);
}
