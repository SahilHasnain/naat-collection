/**
 * Appwrite Configuration for Next.js
 *
 * This file adapts the shared Appwrite config for Next.js environment variables.
 */

import { AppwriteService } from "@naat-collection/api-client";
import {
  createAppwriteConfig,
  validateAppwriteConfig as validateConfig,
} from "@naat-collection/shared";

// Map Next.js environment variables to shared config format
const env = {
  APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
  APPWRITE_NAATS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID,
  APPWRITE_CHANNELS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID,
  APPWRITE_AUDIO_CACHE_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_AUDIO_CACHE_COLLECTION_ID,
  AUDIO_EXTRACTION_FUNCTION_URL:
    process.env.NEXT_PUBLIC_AUDIO_EXTRACTION_FUNCTION_URL,
  AUDIO_STREAMING_FUNCTION_URL:
    process.env.NEXT_PUBLIC_AUDIO_STREAMING_FUNCTION_URL,
  RAPIDAPI_KEY: process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
};

export const appwriteConfig = createAppwriteConfig(env);

/**
 * Validates that all required Appwrite configuration values are present
 * @throws Error if any required configuration is missing
 */
export function validateAppwriteConfig(): void {
  validateConfig(appwriteConfig);
}

/**
 * Singleton instance of AppwriteService for web
 */
export const appwriteService = new AppwriteService({
  config: appwriteConfig,
  onError: (error, context) => {
    // Log errors to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Appwrite error:", error, context);
    }
    // In production, you could send to error tracking service
  },
});

/**
 * Direct Appwrite SDK exports for admin operations
 */
import { Client, Databases, Storage } from "appwrite";

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

export const databases = new Databases(client);
export const storage = new Storage(client);
