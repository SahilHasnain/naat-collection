/**
 * Appwrite Function: Extract and Upload Audio
 *
 * Request body:
 * - naatId?: string
 * - youtubeId?: string
 *
 * One of naatId or youtubeId is required.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { Client, Databases, ID, Query, Storage, type Models } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import youtubedl from "youtube-dl-exec";

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ||
  process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
  "https://cloud.appwrite.io/v1";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "";
const NAATS_COLLECTION_ID = process.env.APPWRITE_NAATS_COLLECTION_ID || "";
const AUDIO_BUCKET_ID = process.env.APPWRITE_AUDIO_BUCKET_ID || "audio-files";
const TMP_DIR = "/tmp/extract-audio";
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

interface ExtractAudioPayload {
  naatId?: string;
  youtubeId?: string;
}

interface NaatDocument extends Models.Document {
  title?: string;
  youtubeId?: string;
  audioId?: string | null;
}

interface AppwriteRequest {
  body?: unknown;
  bodyJson?: unknown;
}

interface AppwriteResponse {
  json: (body: Record<string, unknown>, statusCode?: number) => unknown;
}

interface AppwriteContext {
  req: AppwriteRequest;
  res: AppwriteResponse;
  log: (message: string) => void;
  error: (message: string) => void;
}

function ensureRequiredEnv(): void {
  const required = [
    "APPWRITE_FUNCTION_PROJECT_ID",
    "APPWRITE_API_KEY",
    "APPWRITE_DATABASE_ID",
    "APPWRITE_NAATS_COLLECTION_ID",
  ];

  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

function ensureTempDir(): void {
  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }
}

function parseRequestBody(req: AppwriteRequest): ExtractAudioPayload {
  if (req.bodyJson && typeof req.bodyJson === "object") {
    return req.bodyJson as ExtractAudioPayload;
  }

  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body) as ExtractAudioPayload;
  }

  if (typeof req.body === "object") {
    return req.body as ExtractAudioPayload;
  }

  return {};
}

function sanitizeTitle(title = "audio"): string {
  return title.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 50);
}

function cleanupFiles(paths: Array<string | null>): void {
  for (const filePath of paths) {
    if (!filePath) continue;

    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {
      // Best effort cleanup only.
    }
  }
}

async function findNaatDocument(
  databases: Databases,
  identifiers: { naatId?: string; youtubeId?: string },
): Promise<NaatDocument> {
  if (identifiers.naatId) {
    return (await databases.getDocument(
      DATABASE_ID,
      NAATS_COLLECTION_ID,
      identifiers.naatId,
    )) as NaatDocument;
  }

  const response = await databases.listDocuments(DATABASE_ID, NAATS_COLLECTION_ID, [
    Query.equal("youtubeId", identifiers.youtubeId || ""),
    Query.limit(1),
  ]);

  if (response.documents.length === 0) {
    throw new Error(`No naat found for youtubeId: ${identifiers.youtubeId}`);
  }

  return response.documents[0] as NaatDocument;
}

async function downloadAudioFile(
  youtubeId: string,
  title: string | undefined,
  log: (message: string) => void,
): Promise<string> {
  ensureTempDir();

  const baseName = `${youtubeId}_${sanitizeTitle(title) || "audio"}`;
  const outputTemplate = join(TMP_DIR, `${baseName}.%(ext)s`);

  log(`Downloading audio for YouTube ID ${youtubeId}`);

  await youtubedl(`https://www.youtube.com/watch?v=${youtubeId}`, {
    format: "bestaudio[ext=m4a]/bestaudio",
    extractAudio: true,
    audioFormat: "m4a",
    audioQuality: "128K",
    maxFilesize: "200M",
    output: outputTemplate,
    noPlaylist: true,
    noWarnings: true,
    preferFreeFormats: false,
  });

  const prefix = `${baseName}.`;
  const downloadedFile = readdirSync(TMP_DIR)
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => join(TMP_DIR, entry))
    .find((entry) => statSync(entry).isFile());

  if (!downloadedFile) {
    throw new Error("yt-dlp completed but no audio file was produced");
  }

  return downloadedFile;
}

async function uploadAudioFile(
  storage: Storage,
  filePath: string,
  youtubeId: string,
  log: (message: string) => void,
) {
  const fileSizeMb = (statSync(filePath).size / 1024 / 1024).toFixed(2);
  log(`Uploading ${fileSizeMb}MB audio file to Appwrite Storage`);

  return storage.createFile({
    bucketId: AUDIO_BUCKET_ID,
    fileId: ID.unique(),
    file: InputFile.fromPath(filePath, `${youtubeId}.m4a`),
  });
}

export default async ({ req, res, log, error: logError }: AppwriteContext) => {
  let downloadedFilePath: string | null = null;

  try {
    ensureRequiredEnv();

    const payload = parseRequestBody(req);
    const naatId = payload.naatId?.trim();
    const youtubeId = payload.youtubeId?.trim();

    if (!naatId && !youtubeId) {
      return res.json(
        {
          success: false,
          error: "Request body must include either naatId or youtubeId",
        },
        400,
      );
    }

    if (youtubeId && !YOUTUBE_ID_PATTERN.test(youtubeId)) {
      return res.json(
        {
          success: false,
          error: "Invalid youtubeId format",
        },
        400,
      );
    }

    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || "")
      .setKey(process.env.APPWRITE_API_KEY || "");

    const databases = new Databases(client);
    const storage = new Storage(client);

    const naat = await findNaatDocument(databases, { naatId, youtubeId });
    const resolvedYoutubeId = naat.youtubeId || youtubeId;

    if (!resolvedYoutubeId || !YOUTUBE_ID_PATTERN.test(resolvedYoutubeId)) {
      return res.json(
        {
          success: false,
          error: "Resolved naat does not have a valid youtubeId",
        },
        400,
      );
    }

    if (naat.audioId) {
      log(`Audio already exists for ${naat.$id}: ${naat.audioId}`);
      return res.json({
        success: true,
        skipped: true,
        naatId: naat.$id,
        youtubeId: resolvedYoutubeId,
        audioId: naat.audioId,
      });
    }

    downloadedFilePath = await downloadAudioFile(
      resolvedYoutubeId,
      naat.title,
      log,
    );

    const uploaded = await uploadAudioFile(
      storage,
      downloadedFilePath,
      resolvedYoutubeId,
      log,
    );

    await databases.updateDocument(DATABASE_ID, NAATS_COLLECTION_ID, naat.$id, {
      audioId: uploaded.$id,
    });

    log(`Audio extraction complete for ${naat.$id}`);

    return res.json({
      success: true,
      naatId: naat.$id,
      youtubeId: resolvedYoutubeId,
      audioId: uploaded.$id,
      bucketId: AUDIO_BUCKET_ID,
      fileName: uploaded.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`Extract audio failed: ${message}`);

    return res.json(
      {
        success: false,
        error: message,
      },
      500,
    );
  } finally {
    cleanupFiles([downloadedFilePath]);
  }
};
