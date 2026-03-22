const { spawn } = require("child_process");
const dotenv = require("dotenv");
const { existsSync, mkdirSync, unlinkSync, statSync, readdirSync } = require("fs");
const { join } = require("path");
const { Client, Databases, Query, Storage, ID } = require("node-appwrite");
const { InputFile } = require("node-appwrite/file");

dotenv.config({ path: process.env.AUDIO_WORKER_ENV_FILE || ".env" });

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ||
  process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
  "";
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_FUNCTION_PROJECT_ID ||
  "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "";
const NAATS_COLLECTION_ID = process.env.APPWRITE_NAATS_COLLECTION_ID || "";
const AUDIO_BUCKET_ID =
  process.env.AUDIO_WORKER_BUCKET_ID ||
  process.env.APPWRITE_AUDIO_BUCKET_ID ||
  "audio-files";
const YTDLP_BINARY = process.env.YTDLP_BINARY || "yt-dlp";
const YTDLP_COOKIES_PATH = process.env.YTDLP_COOKIES_PATH || "";
const LIMIT = Number.parseInt(process.env.AUDIO_WORKER_LIMIT || "10", 10);
const DELAY_MS = Number.parseInt(process.env.AUDIO_WORKER_DELAY_MS || "2000", 10);
const TEMP_DIR = join(process.cwd(), "temp-audio");

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeTitle(title = "audio") {
  return title.replace(/[^a-z0-9]/gi, "_").slice(0, 50);
}

async function fetchPendingNaats(userLimit = LIMIT) {
  const batchSize = 100;
  let allNaats = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await databases.listDocuments(
      DATABASE_ID,
      NAATS_COLLECTION_ID,
      [Query.isNull("audioId"), Query.limit(batchSize), Query.offset(offset)],
    );

    allNaats.push(...response.documents);
    hasMore = response.documents.length === batchSize;
    offset += batchSize;

    if (allNaats.length >= userLimit) {
      allNaats = allNaats.slice(0, userLimit);
      hasMore = false;
    }
  }

  return allNaats;
}

async function downloadAudio(youtubeId, title) {
  ensureTempDir();

  const outputTemplate = join(
    TEMP_DIR,
    `${youtubeId}_${sanitizeTitle(title)}.%(ext)s`,
  );

  const args = [
    `https://www.youtube.com/watch?v=${youtubeId}`,
    "--format",
    "bestaudio[ext=m4a]/bestaudio",
    "--extract-audio",
    "--audio-format",
    "m4a",
    "--audio-quality",
    "128K",
    "--max-filesize",
    "200M",
    "--output",
    outputTemplate,
    "--no-playlist",
    "--no-warnings",
  ];

  if (YTDLP_COOKIES_PATH) {
    args.push("--cookies", YTDLP_COOKIES_PATH);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP_BINARY, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to spawn ${YTDLP_BINARY}: ${error.message}`));
    });

    child.on("close", (code) => {
      const prefix = `${youtubeId}_${sanitizeTitle(title)}.`;
      const filePath = readdirSync(TEMP_DIR)
        .filter((entry) => entry.startsWith(prefix))
        .map((entry) => join(TEMP_DIR, entry))
        .find((entry) => statSync(entry).isFile());

      if (code === 0 && filePath) {
        resolve(filePath);
      } else {
        reject(
          new Error(`yt-dlp failed with code ${code}: ${stderr || "No stderr"}`),
        );
      }
    });
  });
}

async function uploadAudio(filePath, youtubeId) {
  const uploaded = await storage.createFile({
    bucketId: AUDIO_BUCKET_ID,
    fileId: ID.unique(),
    file: InputFile.fromPath(filePath, `${youtubeId}.m4a`),
  });

  return uploaded.$id;
}

async function updateNaatWithAudioId(naatId, audioFileId) {
  await databases.updateDocument(DATABASE_ID, NAATS_COLLECTION_ID, naatId, {
    audioId: audioFileId,
  });
}

function cleanupTempFile(filePath) {
  try {
    if (filePath && existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch {}
}

async function processNaat(naat, index, total) {
  console.log(`[${index + 1}/${total}] ${naat.title}`);
  let tempFilePath = null;

  try {
    tempFilePath = await downloadAudio(naat.youtubeId, naat.title);
    const audioFileId = await uploadAudio(tempFilePath, naat.youtubeId);
    await updateNaatWithAudioId(naat.$id, audioFileId);
    console.log(`  uploaded ${audioFileId}`);
    return { success: true, naatId: naat.$id, audioId: audioFileId };
  } catch (error) {
    console.error(`  error: ${error.message}`);
    return { success: false, naatId: naat.$id, error: error.message };
  } finally {
    cleanupTempFile(tempFilePath);
  }
}

async function main() {
  console.log("VM audio worker started");
  console.log(`Bucket: ${AUDIO_BUCKET_ID}`);
  console.log(`yt-dlp: ${YTDLP_BINARY}`);

  const naats = await fetchPendingNaats(LIMIT);
  console.log(`Found ${naats.length} naats without audio`);

  const results = [];
  for (let index = 0; index < naats.length; index += 1) {
    results.push(await processNaat(naats[index], index, naats.length));
    if (index < naats.length - 1 && DELAY_MS > 0) {
      await sleep(DELAY_MS);
    }
  }

  const successful = results.filter((result) => result.success).length;
  console.log(`Done. successful=${successful} failed=${results.length - successful}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
