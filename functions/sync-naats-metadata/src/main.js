/**
 * Sync Naats Metadata Cache
 *
 * Fetches all naats in batches and stores lightweight metadata in a single
 * cache document for For You ranking and fuzzy search on the client.
 *
 * Schedule: every 6 hours (cron: 0 star-slash-6 star star star)
 */

import { Client, Databases, Query } from "node-appwrite";

const METADATA_CACHE_COLLECTION_ID = "naats-metadata-cache";
const CACHE_DOCUMENT_ID = "global";

function mapDocumentToMetadata(doc) {
  return {
    id: doc.$id,
    title: doc.title,
    channelId: doc.channelId,
    channelName: doc.channelName,
    views: doc.views || 0,
    uploadDate: doc.uploadDate,
    thumbnailUrl: doc.thumbnailUrl,
    duration: doc.duration,
    cutAudio: doc.cutAudio || null,
    youtubeId: doc.youtubeId,
  };
}

export default async ({ res, log, error }) => {
  const startTime = Date.now();

  const client = new Client()
    .setEndpoint(
      process.env.APPWRITE_ENDPOINT ||
        process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
        "",
    )
    .setProject(
      process.env.APPWRITE_PROJECT_ID ||
        process.env.APPWRITE_FUNCTION_PROJECT_ID ||
        "",
    )
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const naatsCollectionId = process.env.APPWRITE_NAATS_COLLECTION_ID;

  try {
    log("🔄 Starting metadata sync...");

    const allMetadata = [];
    let offset = 0;
    const batchSize = 500;
    let hasMore = true;
    let batchCount = 0;

    while (hasMore) {
      batchCount++;
      log(`Fetching batch ${batchCount} (offset: ${offset})...`);

      const response = await databases.listDocuments(
        databaseId,
        naatsCollectionId,
        [
          Query.limit(batchSize),
          Query.offset(offset),
          Query.orderDesc("uploadDate"),
          Query.or([Query.equal("exclude", false), Query.isNull("exclude")]),
        ],
      );

      const metadata = response.documents.map(mapDocumentToMetadata);
      allMetadata.push(...metadata);
      hasMore = response.documents.length === batchSize;
      offset += batchSize;

      log(
        `  ✓ Batch ${batchCount}: ${metadata.length} naats (total: ${allMetadata.length})`,
      );
    }

    log(`✅ Fetched ${allMetadata.length} naats in ${batchCount} batches`);

    const cacheData = {
      metadata: JSON.stringify(allMetadata),
      updatedAt: new Date().toISOString(),
      totalCount: allMetadata.length,
    };

    log("💾 Saving to cache...");

    try {
      await databases.updateDocument(
        databaseId,
        METADATA_CACHE_COLLECTION_ID,
        CACHE_DOCUMENT_ID,
        cacheData,
      );
      log("✅ Cache updated");
    } catch (updateError) {
      log("Creating new cache document...");
      await databases.createDocument(
        databaseId,
        METADATA_CACHE_COLLECTION_ID,
        CACHE_DOCUMENT_ID,
        cacheData,
      );
      log("✅ Cache created");
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`✅ Sync complete in ${duration}s`);

    return res.json({
      success: true,
      totalNaats: allMetadata.length,
      batches: batchCount,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    error(`❌ Sync failed: ${err.message}`);
    return res.json(
      {
        success: false,
        error: err.message,
      },
      500,
    );
  }
};
