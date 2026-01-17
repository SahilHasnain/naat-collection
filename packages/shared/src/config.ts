/**
 * Appwrite Configuration
 *
 * Platform-agnostic configuration for Appwrite backend.
 * Each platform (mobile/web) should provide environment variables.
 */

export interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  databaseId: string;
  naatsCollectionId: string;
  channelsCollectionId: string;
  audioCacheCollectionId: string;
  audioExtractionFunctionUrl: string;
  audioStreamingFunctionUrl: string;
  rapidApiKey: string;
}

/**
 * Creates Appwrite configuration from environment variables
 * @param env - Environment variables object
 */
export function createAppwriteConfig(
  env: Record<string, string | undefined>,
): AppwriteConfig {
  return {
    endpoint: env.APPWRITE_ENDPOINT || "",
    projectId: env.APPWRITE_PROJECT_ID || "",
    databaseId: env.APPWRITE_DATABASE_ID || "",
    naatsCollectionId: env.APPWRITE_NAATS_COLLECTION_ID || "",
    channelsCollectionId: env.APPWRITE_CHANNELS_COLLECTION_ID || "",
    audioCacheCollectionId: env.APPWRITE_AUDIO_CACHE_COLLECTION_ID || "",
    audioExtractionFunctionUrl: env.AUDIO_EXTRACTION_FUNCTION_URL || "",
    audioStreamingFunctionUrl: env.AUDIO_STREAMING_FUNCTION_URL || "",
    rapidApiKey: env.RAPIDAPI_KEY || "",
  };
}

/**
 * Validates that all required Appwrite configuration values are present
 * @throws Error if any required configuration is missing
 */
export function validateAppwriteConfig(config: AppwriteConfig): void {
  const missingVars: string[] = [];

  if (!config.endpoint) {
    missingVars.push("APPWRITE_ENDPOINT");
  }
  if (!config.projectId) {
    missingVars.push("APPWRITE_PROJECT_ID");
  }
  if (!config.databaseId) {
    missingVars.push("APPWRITE_DATABASE_ID");
  }
  if (!config.naatsCollectionId) {
    missingVars.push("APPWRITE_NAATS_COLLECTION_ID");
  }
  if (!config.channelsCollectionId) {
    missingVars.push("APPWRITE_CHANNELS_COLLECTION_ID");
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Appwrite configuration: ${missingVars.join(", ")}`,
    );
  }
}
