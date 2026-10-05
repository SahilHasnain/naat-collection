/**
 * Creates the isolated Appwrite resources used by model tests.
 *
 * Usage: node scripts/setup/setup-model-test-pipeline.js
 */

const sdk = require("node-appwrite");
require("dotenv").config({ path: ".env.appwrite" });
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: "apps/mobile/.env" });
require("dotenv").config({ path: "apps/mobile/.env.local" });

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY || process.env.APPWRITE_SECRET_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
};

const client = new sdk.Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);
const databases = new sdk.Databases(client);
const storage = new sdk.Storage(client);

async function ensureBucket() {
  try {
    await storage.getBucket("audio-files-test");
    await storage.updateBucket(
      "audio-files-test",
      "Model Test Audio",
      [sdk.Permission.read(sdk.Role.any())],
      false,
      true,
      100 * 1024 * 1024,
      ["m4a", "mp4", "mp3", "wav"],
    );
    console.log("Bucket audio-files-test already exists.");
  } catch (error) {
    if (error.code !== 404) throw error;
    await storage.createBucket(
      "audio-files-test",
      "Model Test Audio",
      [sdk.Permission.read(sdk.Role.any())],
      false,
      true,
      100 * 1024 * 1024,
      ["m4a", "mp4", "mp3", "wav"],
    );
    console.log("Created bucket audio-files-test.");
  }
}

async function ensureCollection(collectionId, name) {
  try {
    await databases.getCollection(config.databaseId, collectionId);
    console.log(`Collection ${collectionId} already exists.`);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createCollection(config.databaseId, collectionId, name, [], false);
    console.log(`Created collection ${collectionId}.`);
  }
}

async function waitForAttribute(collectionId, key) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const collection = await databases.getCollection(config.databaseId, collectionId);
    const attribute = collection.attributes.find((item) => item.key === key);
    if (attribute?.status === "available") return;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Attribute ${collectionId}.${key} did not become available`);
}

async function ensureAttribute(collectionId, key, create) {
  try {
    await create();
    await waitForAttribute(collectionId, key);
    console.log(`Created ${collectionId}.${key}.`);
  } catch (error) {
    if (error.code !== 409) throw error;
  }
}

async function setupTestCollection() {
  const id = "naat_model_tests";
  await ensureCollection(id, "Naat Model Tests");
  await ensureAttribute(id, "title", () => databases.createStringAttribute(config.databaseId, id, "title", 500, true));
  await ensureAttribute(id, "sourceUrl", () => databases.createUrlAttribute(config.databaseId, id, "sourceUrl", false));
  await ensureAttribute(id, "audioId", () => databases.createStringAttribute(config.databaseId, id, "audioId", 128, true));
  await ensureAttribute(id, "status", () => databases.createStringAttribute(config.databaseId, id, "status", 32, true));
  await ensureAttribute(id, "modelRevision", () => databases.createStringAttribute(config.databaseId, id, "modelRevision", 100, false));
  await ensureAttribute(id, "duration", () => databases.createIntegerAttribute(config.databaseId, id, "duration", false, 0, undefined, 0));
  await ensureAttribute(id, "segmentsJson", () => databases.createStringAttribute(config.databaseId, id, "segmentsJson", 50000, false));
  await ensureAttribute(id, "resultJson", () => databases.createStringAttribute(config.databaseId, id, "resultJson", 50000, false));
  await ensureAttribute(id, "error", () => databases.createStringAttribute(config.databaseId, id, "error", 5000, false));
  await ensureAttribute(id, "finishedAt", () => databases.createDatetimeAttribute(config.databaseId, id, "finishedAt", false));
}

async function setupJobsCollection() {
  const id = "ai_model_test_jobs";
  await ensureCollection(id, "AI Model Test Jobs");
  await ensureAttribute(id, "type", () => databases.createStringAttribute(config.databaseId, id, "type", 64, true));
  await ensureAttribute(id, "testId", () => databases.createStringAttribute(config.databaseId, id, "testId", 128, true));
  await ensureAttribute(id, "audioId", () => databases.createStringAttribute(config.databaseId, id, "audioId", 128, true));
  await ensureAttribute(id, "status", () => databases.createStringAttribute(config.databaseId, id, "status", 32, true));
  await ensureAttribute(id, "progress", () => databases.createIntegerAttribute(config.databaseId, id, "progress", false, 0, 100, 0));
  await ensureAttribute(id, "attempts", () => databases.createIntegerAttribute(config.databaseId, id, "attempts", false, 0, undefined, 0));
  await ensureAttribute(id, "workerId", () => databases.createStringAttribute(config.databaseId, id, "workerId", 128, false));
  await ensureAttribute(id, "leaseUntil", () => databases.createDatetimeAttribute(config.databaseId, id, "leaseUntil", false));
  await ensureAttribute(id, "startedAt", () => databases.createDatetimeAttribute(config.databaseId, id, "startedAt", false));
  await ensureAttribute(id, "finishedAt", () => databases.createDatetimeAttribute(config.databaseId, id, "finishedAt", false));
  await ensureAttribute(id, "resultJson", () => databases.createStringAttribute(config.databaseId, id, "resultJson", 50000, false));
  await ensureAttribute(id, "error", () => databases.createStringAttribute(config.databaseId, id, "error", 5000, false));
}

async function main() {
  if (!config.endpoint || !config.projectId || !config.apiKey || !config.databaseId) {
    throw new Error("Missing Appwrite configuration");
  }
  await ensureBucket();
  await setupTestCollection();
  await setupJobsCollection();
  console.log("Model test pipeline resources are ready.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
