/**
 * Appwrite Configuration
 *
 * This file contains the configuration for connecting to Appwrite backend.
 * Environment variables are loaded from .env.local and must be prefixed with
 * EXPO_PUBLIC_ to be accessible in the React Native app.
 */

export const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "",
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "",
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "",
  naatsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID || "",
  audioCacheCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_AUDIO_CACHE_COLLECTION_ID || "",
  audioExtractionFunctionUrl:
    process.env.EXPO_PUBLIC_AUDIO_EXTRACTION_FUNCTION_URL || "",
  rapidApiKey: process.env.EXPO_PUBLIC_RAPIDAPI_KEY || "",
};

/**
 * Validates that all required Appwrite configuration values are present
 * @throws Error if any required configuration is missing
 */
export function validateAppwriteConfig(): void {
  const missingVars: string[] = [];

  if (!appwriteConfig.endpoint) {
    missingVars.push("EXPO_PUBLIC_APPWRITE_ENDPOINT");
  }
  if (!appwriteConfig.projectId) {
    missingVars.push("EXPO_PUBLIC_APPWRITE_PROJECT_ID");
  }
  if (!appwriteConfig.databaseId) {
    missingVars.push("EXPO_PUBLIC_APPWRITE_DATABASE_ID");
  }
  if (!appwriteConfig.naatsCollectionId) {
    missingVars.push("EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID");
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Appwrite configuration. Please set the following environment variables: ${missingVars.join(", ")}`
    );
  }
}
