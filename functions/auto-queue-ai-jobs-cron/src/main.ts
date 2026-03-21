import { Client, Databases, ID, Query } from "node-appwrite";

const DEFAULT_BATCH_SIZE = Number(process.env.AUTO_QUEUE_BATCH_SIZE || "25");
const DEFAULT_SCAN_LIMIT = Number(process.env.AUTO_QUEUE_SCAN_LIMIT || "500");
const PAGE_SIZE = 100;

interface NaatDoc {
  $id: string;
  audioId?: string;
  title?: string;
  exclude?: boolean;
  isAiCut?: boolean;
  cutSegments?: string | null;
}

interface AppwriteContext {
  req?: {
    bodyText?: string;
  };
  res: {
    json: (body: Record<string, unknown>, statusCode?: number) => unknown;
  };
  log: (message: string) => void;
  error: (message: string) => void;
}

function createDatabases() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT || "")
    .setProject(process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || "")
    .setKey(process.env.APPWRITE_API_KEY || "");

  return new Databases(client);
}

function parsePayload(bodyText?: string) {
  if (!bodyText) return {};
  try {
    return JSON.parse(bodyText) as { batchSize?: number; scanLimit?: number };
  } catch {
    return {};
  }
}

async function fetchEligibleCandidates(
  databases: Databases,
  databaseId: string,
  naatsCollectionId: string,
  jobsCollectionId: string,
  batchSize: number,
  scanLimit: number,
  log: (message: string) => void,
) {
  const candidates: NaatDoc[] = [];

  for (let offset = 0; offset < scanLimit && candidates.length < batchSize; offset += PAGE_SIZE) {
    const response = await databases.listDocuments(databaseId, naatsCollectionId, [
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
      Query.orderDesc("views"),
      Query.isNotNull("audioId"),
      Query.isNull("cutSegments"),
      Query.or([Query.equal("isAiCut", false), Query.isNull("isAiCut")]),
      Query.or([Query.equal("exclude", false), Query.isNull("exclude")]),
    ]);

    const page = response.documents as unknown as NaatDoc[];
    if (page.length === 0) break;

    const naatIds = page.map((naat) => naat.$id);
    const existingJobs = await databases.listDocuments(databaseId, jobsCollectionId, [
      Query.equal("type", ["manual-cut-detect"]),
      Query.equal("naatId", naatIds),
      Query.limit(Math.min(naatIds.length * 5, 500)),
    ]);

    const naatIdsWithJobs = new Set(
      existingJobs.documents.map((job) => String(job.naatId || "")),
    );

    for (const naat of page) {
      if (naatIdsWithJobs.has(naat.$id)) continue;
      candidates.push(naat);
      if (candidates.length >= batchSize) break;
    }
  }

  log(`Eligible unqueued candidates found: ${candidates.length}`);
  return candidates;
}

export default async ({ req, res, log, error }: AppwriteContext) => {
  try {
    const payload = parsePayload(req?.bodyText);
    const batchSize = Math.max(1, Math.min(payload.batchSize || DEFAULT_BATCH_SIZE, 100));
    const scanLimit = Math.max(batchSize, Math.min(payload.scanLimit || DEFAULT_SCAN_LIMIT, 2000));

    const databaseId = process.env.APPWRITE_DATABASE_ID!;
    const naatsCollectionId = process.env.APPWRITE_NAATS_COLLECTION_ID!;
    const jobsCollectionId = process.env.APPWRITE_AI_JOBS_COLLECTION_ID!;

    if (!databaseId || !naatsCollectionId || !jobsCollectionId) {
      return res.json({ error: "Missing required Appwrite environment variables" }, 500);
    }

    const databases = createDatabases();
    const candidates = await fetchEligibleCandidates(
      databases,
      databaseId,
      naatsCollectionId,
      jobsCollectionId,
      batchSize,
      scanLimit,
      log,
    );

    if (candidates.length === 0) {
      return res.json({
        queued: 0,
        scannedLimit: scanLimit,
        message: "No new eligible naats found to queue",
      });
    }

    const queuedIds: string[] = [];

    for (const naat of candidates) {
      if (!naat.audioId) continue;

      await databases.createDocument(databaseId, jobsCollectionId, ID.unique(), {
        type: "manual-cut-detect",
        naatId: naat.$id,
        audioId: naat.audioId,
        status: "pending",
        progress: 0,
        attempts: 0,
        error: "",
        resultJson: "",
      });

      queuedIds.push(naat.$id);
      log(`Queued AI job for naat ${naat.$id}${naat.title ? ` (${naat.title})` : ""}`);
    }

    return res.json({
      queued: queuedIds.length,
      queuedIds,
      scannedLimit: scanLimit,
      batchSize,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(`Auto queue AI jobs cron failed: ${message}`);
    return res.json({ error: message }, 500);
  }
};
