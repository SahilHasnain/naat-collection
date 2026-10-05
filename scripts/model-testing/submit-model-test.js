/**
 * Submit an audio file to the isolated model-test pipeline.
 *
 * Usage:
 * node scripts/model-testing/submit-model-test.js \
 *   --title="Lo Wo Aya Mera Hami" \
 *   --audio-url="https://.../download?project=..."
 * or --audio-file="path/to/audio.m4a" --audio-id="uploaded-file-id"
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const sdk = require("node-appwrite");
const { InputFile } = require("node-appwrite/file");
require("dotenv").config({ path: ".env.appwrite" });
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: "apps/mobile/.env" });
require("dotenv").config({ path: "apps/mobile/.env.local" });

const args = Object.fromEntries(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  }),
);

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_SECRET_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new sdk.Databases(client);
const storage = new sdk.Storage(client);

function required(name) {
  if (!args[name]) throw new Error(`Missing --${name}`);
  return args[name];
}

async function main() {
  const title = required("title");
  const audioUrl = args["audio-url"];
  const audioFile = args["audio-file"];
  const existingAudioId = args["audio-id"];
  if (!audioUrl && !audioFile) throw new Error("Missing --audio-url or --audio-file");
  const sourceUrl = args["source-url"] || audioUrl || "";
  const extension = audioFile
    ? path.extname(audioFile) || ".m4a"
    : path.extname(new URL(audioUrl).pathname) || ".m4a";
  const tempPath = audioFile
    ? path.resolve(audioFile)
    : path.join(os.tmpdir(), `model-test-${Date.now()}${extension}`);

  if (!audioFile) {
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error(`Audio download failed: HTTP ${response.status}`);
    fs.writeFileSync(tempPath, Buffer.from(await response.arrayBuffer()));
  }

  try {
    const uploadedAudio = existingAudioId
      ? { $id: existingAudioId }
      : await storage.createFile(
          {
            bucketId: "audio-files-test",
            fileId: sdk.ID.unique(),
            file: InputFile.fromPath(tempPath, `model-test-${Date.now()}${extension}`),
          },
        );
    const test = await databases.createDocument(
      databaseId,
      "naat_model_tests",
      sdk.ID.unique(),
      {
        title,
        sourceUrl,
        audioId: uploadedAudio.$id,
        status: "queued",
        modelRevision: process.env.MODEL_REVISION || "2b6e6e10b03f6e151a1ea347e05ae0144ad8b082",
        duration: 0,
        segmentsJson: "",
        resultJson: "",
        error: "",
      },
    );
    const job = await databases.createDocument(
      databaseId,
      "ai_model_test_jobs",
      sdk.ID.unique(),
      {
        type: "model-test",
        testId: test.$id,
        audioId: uploadedAudio.$id,
        status: "pending",
        progress: 0,
        attempts: 0,
        workerId: "",
        resultJson: "",
        error: "",
      },
    );
    console.log(JSON.stringify({ testId: test.$id, jobId: job.$id, audioId: uploadedAudio.$id }, null, 2));
  } finally {
    if (!audioFile) fs.rmSync(tempPath, { force: true });
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
