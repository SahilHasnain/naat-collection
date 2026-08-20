/**
 * Delete Original Audio Cron Function
 *
 * Finds naats that have a cut audio (`cutAudio` set) and still keep the
 * original full audio (`audioId`), deletes the original audio file from
 * storage to reclaim space, then clears the `audioId` field on the doc.
 *
 * Skips docs where `cutAudio === audioId` (the "no cuts needed" case links
 * the original audio as the cut audio — deleting it would break playback).
 *
 * Idempotent: cleared `audioId` docs are not re-fetched; missing files are
 * treated as already deleted.
 */

import { Client, Databases, Query, Storage } from "node-appwrite";

const AUDIO_BUCKET = process.env.APPWRITE_AUDIO_BUCKET_ID || "audio-files";
const BATCH_SIZE = 25;
const PAGE_SIZE = 100;

interface NaatDoc {
  $id: string;
  title?: string;
  audioId?: string | null;
  cutAudio?: string | null;
}

interface AppwriteContext {
  res: {
    json: (body: Record<string, unknown>, statusCode?: number) => unknown;
  };
  log: (message: string) => void;
  error: (message: string) => void;
}

function createClients() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT || "")
    .setProject(process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || "")
    .setKey(process.env.APPWRITE_API_KEY || "");

  return {
    databases: new Databases(client),
    storage: new Storage(client),
  };
}

export default async ({ res, log, error: logError }: AppwriteContext) => {
  try {
    const databaseId = process.env.APPWRITE_DATABASE_ID!;
    const naatsCollectionId = process.env.APPWRITE_NAATS_COLLECTION_ID!;

    if (!databaseId || !naatsCollectionId) {
      return res.json({ error: "Missing required Appwrite environment variables" }, 500);
    }

    const { databases, storage } = createClients();

    let deleted = 0;
    let skippedLinked = 0;
    let fileErrors = 0;
    let docErrors = 0;
    let fetched = 0;

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const response = await databases.listDocuments(databaseId, naatsCollectionId, [
        Query.isNotNull("cutAudio"),
        Query.isNotNull("audioId"),
        Query.limit(PAGE_SIZE),
        Query.offset(offset),
      ]);

      const naats = response.documents as unknown as NaatDoc[];
      if (naats.length === 0) break;
      fetched += naats.length;

      for (const naat of naats) {
        if (!naat.audioId || !naat.cutAudio) continue;
        if (naat.cutAudio === naat.audioId) {
          skippedLinked++;
          continue;
        }

        try {
          await storage.deleteFile(AUDIO_BUCKET, naat.audioId);
          deleted++;
          log(`Deleted original audio ${naat.audioId} for ${naat.title || naat.$id}`);
        } catch (err) {
          const code = (err as { code?: number })?.code;
          if (code === 404) {
            log(`Original audio ${naat.audioId} already missing for ${naat.title || naat.$id}`);
          } else {
            const msg = err instanceof Error ? err.message : String(err);
            logError(`Failed to delete file ${naat.audioId} for ${naat.$id}: ${msg}`);
            fileErrors++;
            continue;
          }
        }

        try {
          await databases.updateDocument(databaseId, naatsCollectionId, naat.$id, {
            audioId: null,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logError(`Failed to clear audioId on ${naat.$id}: ${msg}`);
          docErrors++;
        }
      }

      if (naats.length < PAGE_SIZE) break;
    }

    log(`Done: fetched=${fetched} deleted=${deleted} skippedLinked=${skippedLinked} fileErrors=${fileErrors} docErrors=${docErrors}`);
    return res.json({
      fetched,
      deleted,
      skippedLinked,
      fileErrors,
      docErrors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Delete original audio cron error: ${msg}`);
    return res.json({ error: msg }, 500);
  }
};