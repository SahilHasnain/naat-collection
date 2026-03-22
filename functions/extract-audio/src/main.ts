import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import https from "node:https";
import { Client, Databases, ID, Query, Storage, type Models } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const require = createRequire(import.meta.url);
const youtubeDlModule = require("youtube-dl-exec") as typeof import("youtube-dl-exec");
const youtubedl: typeof import("youtube-dl-exec").default =
  youtubeDlModule.default ?? youtubeDlModule;

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ||
  process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
  "https://cloud.appwrite.io/v1";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "";
const NAATS_COLLECTION_ID = process.env.APPWRITE_NAATS_COLLECTION_ID || "";
const AUDIO_BUCKET_ID = process.env.APPWRITE_AUDIO_BUCKET_ID || "audio-files";
const TMP_DIR = "/tmp/extract-audio";
const TMP_COOKIES_PATH = join(TMP_DIR, "youtube-cookies.txt");
const FETCH_BATCH_SIZE = 100;
const PROCESS_LIMIT = Number.parseInt(
  process.env.AUDIO_CRON_PROCESS_LIMIT || "10",
  10,
);
const DELAY_MS = Number.parseInt(process.env.AUDIO_CRON_DELAY_MS || "2000", 10);

interface NaatDocument extends Models.Document {
  title?: string;
  youtubeId?: string;
  audioId?: string | null;
}

interface ProcessResult {
  success: boolean;
  naatId: string;
  error?: string;
  audioId?: string;
}

interface AppwriteContext {
  res: {
    json: (body: Record<string, unknown>, statusCode?: number) => unknown;
  };
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

async function ensureBinary(): Promise<void> {
  const BIN_DIR = join(process.cwd(), "bin");
  const binPath = join(
    BIN_DIR,
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp",
  );

  if (existsSync(binPath)) {
    return; // Binary already exists
  }

  console.log(
    `[Binary] ${process.platform} binary not found, downloading from GitHub...`,
  );

  if (!existsSync(BIN_DIR)) {
    mkdirSync(BIN_DIR, { recursive: true });
  }

  const getPlatformFilename = (): string => {
    if (process.platform === "win32") return "yt-dlp.exe";
    if (process.platform === "darwin") return "yt-dlp_macos";
    return "yt-dlp"; // linux
  };

  const filename = getPlatformFilename();
  const downloadUrl = `https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest`;

  try {
    const release = await new Promise<{ assets: { name: string; browser_download_url: string }[] }>((resolve, reject) => {
      https
        .get(downloadUrl, { headers: { "user-agent": "naat-collection" } }, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        })
        .on("error", reject);
    });

    const asset = release.assets.find((a) => a.name === filename);
    if (!asset) {
      throw new Error(`No release asset found for: ${filename}`);
    }

    console.log(`[Binary] Downloading from: ${asset.browser_download_url}`);

    const binary = await new Promise<Buffer>((resolve, reject) => {
      https
        .get(
          asset.browser_download_url,
          { headers: { "user-agent": "naat-collection" } },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk) => {
              chunks.push(chunk);
            });
            res.on("end", () => {
              resolve(Buffer.concat(chunks));
            });
          },
        )
        .on("error", reject);
    });

    writeFileSync(binPath, binary);

    // Make executable on Unix-like systems
    if (process.platform !== "win32") {
      chmodSync(binPath, 0o755);
    }

    console.log(`[Binary] Downloaded and ready: ${filename}`);
  } catch (err) {
    console.error(`[Binary] Failed to download:`, err);
    throw err;
  }
}

function sanitizeTitle(title = "audio"): string {
  return title.replace(/[^a-z0-9]+/gi, "_").slice(0, 50);
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

function getCookiesPath(log: (message: string) => void): string | undefined {
  ensureTempDir();

  if (process.env.YTDLP_COOKIES?.trim()) {
    writeFileSync(TMP_COOKIES_PATH, process.env.YTDLP_COOKIES, "utf8");
    log("Using yt-dlp cookies from YTDLP_COOKIES env");
    return TMP_COOKIES_PATH;
  }

  const candidates = [
    process.env.YTDLP_COOKIES_PATH,
    join(process.cwd(), "cookies.txt"),
    join(process.cwd(), "youtube-cookies.txt"),
    join(process.cwd(), "..", "cookies.txt"),
    join(process.cwd(), "..", "..", "cookies.txt"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const contents = readFileSync(candidate, "utf8");
      writeFileSync(TMP_COOKIES_PATH, contents, "utf8");
      log(`Using yt-dlp cookies from ${candidate}`);
      return TMP_COOKIES_PATH;
    }
  }

  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPendingNaats(
  databases: Databases,
  userLimit: number,
): Promise<NaatDocument[]> {
  let allNaats: NaatDocument[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await databases.listDocuments<NaatDocument>(
      DATABASE_ID,
      NAATS_COLLECTION_ID,
      [
        Query.isNull("audioId"),
        Query.limit(FETCH_BATCH_SIZE),
        Query.offset(offset),
      ],
    );

    const batch = response.documents;
    allNaats.push(...batch);

    hasMore = batch.length === FETCH_BATCH_SIZE;
    offset += FETCH_BATCH_SIZE;

    if (allNaats.length >= userLimit) {
      allNaats = allNaats.slice(0, userLimit);
      hasMore = false;
    }
  }

  return allNaats;
}

async function downloadAudioFile(
  youtubeId: string,
  title: string | undefined,
  log: (message: string) => void,
): Promise<string> {
  ensureTempDir();
  const cookiesPath = getCookiesPath(log);

  const baseName = `${youtubeId}_${sanitizeTitle(title) || "audio"}`;
  const outputTemplate = join(TMP_DIR, `${baseName}.%(ext)s`);

  log(`  Downloading: ${title || youtubeId}`);
  log(`  YouTube ID: ${youtubeId}`);

  try {
    await youtubedl(`https://www.youtube.com/watch?v=${youtubeId}`, {
      format: "bestaudio[ext=m4a]/bestaudio",
      extractAudio: true,
      audioFormat: "m4a",
      audioQuality: 128,
      cookies: cookiesPath,
      maxFilesize: "200M",
      output: outputTemplate,
      noPlaylist: true,
      noWarnings: true,
      preferFreeFormats: false,
    });
  } catch (error) {
    const details =
      error instanceof Error
        ? error.message ||
          JSON.stringify(error, Object.getOwnPropertyNames(error))
        : JSON.stringify(error);

    throw new Error(`yt-dlp download failed: ${details}`);
  }

  const prefix = `${baseName}.`;
  const downloadedFile = readdirSync(TMP_DIR)
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => join(TMP_DIR, entry))
    .find((entry) => statSync(entry).isFile());

  if (!downloadedFile) {
    throw new Error("yt-dlp completed but no audio file was produced");
  }

  log("  Downloaded successfully");
  return downloadedFile;
}

async function uploadAudioFile(
  storage: Storage,
  filePath: string,
  youtubeId: string,
  log: (message: string) => void,
): Promise<Models.File> {
  const fileSizeMb = (statSync(filePath).size / 1024 / 1024).toFixed(2);
  log(`  Uploading to Appwrite Storage (${fileSizeMb}MB)`);

  const uploaded = await storage.createFile({
    bucketId: AUDIO_BUCKET_ID,
    fileId: ID.unique(),
    file: InputFile.fromPath(filePath, `${youtubeId}.m4a`),
  });

  log(`  Uploaded: ${uploaded.$id}`);
  return uploaded;
}

async function updateNaatWithAudioId(
  databases: Databases,
  naatId: string,
  audioFileId: string,
  log: (message: string) => void,
): Promise<void> {
  await databases.updateDocument(DATABASE_ID, NAATS_COLLECTION_ID, naatId, {
    audioId: audioFileId,
  });
  log("  Updated naat document with audioId");
}

async function processNaat(
  naat: NaatDocument,
  index: number,
  total: number,
  databases: Databases,
  storage: Storage,
  log: (message: string) => void,
): Promise<ProcessResult> {
  let tempFilePath: string | null = null;

  log(`[${index + 1}/${total}] Processing: ${naat.title || naat.$id}`);

  try {
    if (!naat.youtubeId) {
      throw new Error("Missing youtubeId");
    }

    tempFilePath = await downloadAudioFile(naat.youtubeId, naat.title, log);
    const uploaded = await uploadAudioFile(storage, tempFilePath, naat.youtubeId, log);
    await updateNaatWithAudioId(databases, naat.$id, uploaded.$id, log);

    log("  Success");
    return {
      success: true,
      naatId: naat.$id,
      audioId: uploaded.$id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`  Error: ${message}`);
    return {
      success: false,
      naatId: naat.$id,
      error: message,
    };
  } finally {
    cleanupFiles([tempFilePath, TMP_COOKIES_PATH]);
  }
}

export default async ({ res, log, error: logError }: AppwriteContext) => {
  try {
    ensureRequiredEnv();
    await ensureBinary();

    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || "")
      .setKey(process.env.APPWRITE_API_KEY || "");

    const databases = new Databases(client);
    const storage = new Storage(client);

    log("Audio download and upload cron started");
    log(`Database: ${DATABASE_ID}`);
    log(`Collection: ${NAATS_COLLECTION_ID}`);
    log(`Bucket: ${AUDIO_BUCKET_ID}`);
    log(`Process limit: ${PROCESS_LIMIT}`);

    const naats = await fetchPendingNaats(databases, PROCESS_LIMIT);
    log(`Found ${naats.length} naats without audio`);

    if (naats.length === 0) {
      return res.json({
        success: true,
        processed: 0,
        successful: 0,
        failed: 0,
        message: "No naats to process. All videos already have audio.",
      });
    }

    const results: ProcessResult[] = [];

    for (let index = 0; index < naats.length; index += 1) {
      const result = await processNaat(
        naats[index],
        index,
        naats.length,
        databases,
        storage,
        log,
      );
      results.push(result);

      if (index < naats.length - 1 && DELAY_MS > 0) {
        log(`Waiting ${DELAY_MS}ms before next download`);
        await sleep(DELAY_MS);
      }
    }

    const successful = results.filter((result) => result.success).length;
    const failedResults = results.filter((result) => !result.success);

    log(`Summary: ${results.length} processed, ${successful} successful, ${failedResults.length} failed`);

    return res.json({
      success: true,
      processed: results.length,
      successful,
      failed: failedResults.length,
      failures: failedResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`Extract audio cron failed: ${message}`);
    return res.json(
      {
        success: false,
        error: message,
      },
      500,
    );
  }
};
