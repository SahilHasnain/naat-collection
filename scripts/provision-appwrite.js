#!/usr/bin/env node

/**
 * Idempotently provision the Appwrite database and storage resources used by
 * the mobile apps and their Appwrite Functions.
 *
 * Preview (no writes):
 *   npm run provision:appwrite -- --project naat-collection
 * Apply:
 *   npm run provision:appwrite -- --project naat-collection --apply
 *
 * The Appwrite project itself and its API key must already exist. The API key
 * needs databases, collections, attributes, indexes, buckets and files scopes.
 */

const path = require("node:path");
const dotenv = require("dotenv");
const sdk = require("node-appwrite");
const { getProject, projectIds } = require("../apps/mobile/brands");

const args = process.argv.slice(2);
const getArg = (name) => {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const projectId = getArg("project") || process.env.APP_PROJECT_ID;
const apply = args.includes("--apply");

let brand;
try {
  brand = getProject(projectId);
} catch (error) {
  console.error(error.message);
  console.log(`Available projects: ${projectIds.join(", ")}`);
  process.exit(1);
}

if (!projectId) {
  console.error("Missing --project. Available projects:", projectIds.join(", "));
  process.exit(1);
}

const envPath = path.resolve(__dirname, "..", `.env.${projectId}`);
if (require("node:fs").existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
}

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || brand.appwrite.endpoint,
  projectId: brand.appwrite.projectId,
  apiKey: process.env.APPWRITE_API_KEY || process.env.APPWRITE_SECRET_KEY,
  databaseId: brand.appwrite.databaseId,
  collections: {
    naats: brand.appwrite.naatsCollectionId || "naats",
    channels: brand.appwrite.channelsCollectionId || "channels",
    audioCache: brand.appwrite.audioCacheCollectionId || "audio-cache",
    aiJobs: brand.appwrite.aiJobsCollectionId || "ai_jobs",
    liveRadio: brand.appwrite.liveRadioCollectionId || "live_radio",
    liveRadioListeners: brand.appwrite.liveRadioListenersCollectionId || "live_radio_listeners",
    voiceVariantsTable: brand.appwrite.voiceVariantsTableId || "voice_variants",
  },
  buckets: {
    audio: brand.appwrite.audioBucketId || "audio-files",
    cutAudio: brand.appwrite.cutAudioBucketId || "cut-audio-files",
  },
};

const missing = [];
if (!config.endpoint) missing.push("APPWRITE_ENDPOINT");
if (!config.projectId) missing.push("APPWRITE_PROJECT_ID");
if (!config.apiKey) missing.push("APPWRITE_API_KEY");
if (!config.databaseId) missing.push("APPWRITE_DATABASE_ID");
if (missing.length) {
  console.error("Missing required configuration:", missing.join(", "));
  process.exit(1);
}

const client = new sdk.Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new sdk.Databases(client);
const storage = new sdk.Storage(client);
const tablesDB = new sdk.TablesDB(client);

const publicRead = [sdk.Permission.read(sdk.Role.any())];
const noPermissions = [];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function attribute(type, key, options = {}) {
  return { type, key, ...options };
}

const collectionSpecs = [
  {
    id: config.collections.naats,
    name: "Naats",
    permissions: publicRead,
    attributes: [
      attribute("string", "title", { required: true, size: 500 }),
      attribute("string", "youtubeId", { required: true, size: 32 }),
      attribute("string", "channelId", { required: true, size: 64 }),
      attribute("string", "channelName", { required: true, size: 255 }),
      attribute("string", "thumbnail", { size: 500 }),
      attribute("string", "duration", { size: 32 }),
      attribute("integer", "durationSeconds", { min: 0 }),
      attribute("integer", "views", { required: true, min: 0 }),
      attribute("string", "audioId", { size: 100 }),
      attribute("string", "cutAudio", { size: 100 }),
      attribute("boolean", "best", { default: false }),
      attribute("boolean", "exclude", { default: false }),
      attribute("boolean", "isRadio", { default: false }),
      attribute("boolean", "excludeFromAI", { default: false }),
      attribute("string", "cutSegments", { size: 50000 }),
      attribute("float", "cutDuration", { min: 0 }),
      attribute("string", "cutStatus", { size: 32 }),
      attribute("string", "cutModelVersion", { size: 128 }),
      attribute("string", "pendingSourceAudioId", { size: 100 }),
      attribute("string", "pendingCutSegments", { size: 50000 }),
      attribute("string", "pendingCutAudio", { size: 100 }),
      attribute("float", "pendingCutDuration", { min: 0 }),
      attribute("string", "pendingCutStatus", { size: 32 }),
      attribute("string", "pendingCutModelVersion", { size: 128 }),
    ],
    indexes: [
      { key: "title_search", type: "Fulltext", columns: ["title"] },
      { key: "channelId_idx", type: "Key", columns: ["channelId"] },
      { key: "youtubeId_idx", type: "Key", columns: ["youtubeId"] },
      { key: "views_idx", type: "Key", columns: ["views"] },
      { key: "best_idx", type: "Key", columns: ["best"] },
    ],
  },
  {
    id: config.collections.channels,
    name: "Channels",
    permissions: publicRead,
    attributes: [
      attribute("string", "channelId", { required: true, size: 64 }),
      attribute("string", "channelName", { required: true, size: 255 }),
      attribute("integer", "naatCount", { min: 0, default: 0 }),
      attribute("datetime", "lastUpdated"),
      attribute("integer", "minLatest", { min: 0 }),
      attribute("integer", "minPopular", { min: 0 }),
      attribute("integer", "maxDuration", { min: 0 }),
      attribute("boolean", "isOther", { default: false }),
      attribute("string", "type", { size: 20 }),
      attribute("string", "playlistId", { size: 100 }),
    ],
    indexes: [
      { key: "channelId_unique", type: "Unique", columns: ["channelId"] },
    ],
  },
  {
    id: config.collections.audioCache,
    name: "Audio Cache",
    permissions: [sdk.Permission.create("users")],
    documentSecurity: true,
    attributes: [
      attribute("string", "youtubeId", { required: true, size: 32 }),
      attribute("string", "audioId", { size: 100 }),
      attribute("string", "naatId", { size: 64 }),
      attribute("integer", "status", { min: 0, default: 0 }),
    ],
    indexes: [
      { key: "youtubeId_idx", type: "Unique", columns: ["youtubeId"] },
    ],
  },
  {
    id: config.collections.aiJobs,
    name: "AI Jobs",
    permissions: publicRead,
    attributes: [
      attribute("string", "type", { required: true, size: 32 }),
      attribute("string", "naatId", { size: 64 }),
      attribute("string", "status", { required: true, size: 32 }),
      attribute("integer", "priority", { min: 0, default: 0 }),
      attribute("datetime", "leaseUntil"),
      attribute("string", "error", { size: 5000 }),
      attribute("string", "resultJson", { size: 50000 }),
      attribute("datetime", "startedAt"),
      attribute("datetime", "finishedAt"),
      attribute("string", "voicePreset", { size: 32 }),
      attribute("float", "pitchSemitones"),
      attribute("string", "outputAudioId", { size: 64 }),
    ],
    indexes: [
      { key: "type_status_created", type: "Key", columns: ["type", "status", "$createdAt"], orders: ["ASC", "ASC", "ASC"] },
      { key: "naatId_idx", type: "Key", columns: ["naatId"], orders: ["ASC"] },
      { key: "status_lease_idx", type: "Key", columns: ["status", "leaseUntil"], orders: ["ASC", "ASC"] },
    ],
  },
  {
    id: config.collections.liveRadio,
    name: "Live Radio",
    permissions: publicRead,
    attributes: [
      attribute("boolean", "isLive", { default: false }),
      attribute("string", "currentNaatId", { size: 100 }),
      attribute("datetime", "startedAt"),
      attribute("integer", "listenerCount", { min: 0, default: 0 }),
    ],
    indexes: [],
  },
  {
    id: config.collections.liveRadioListeners,
    name: "Live Radio Listeners",
    permissions: noPermissions,
    attributes: [
      attribute("string", "sessionId", { required: true, size: 100 }),
      attribute("datetime", "connectedAt", { required: true }),
      attribute("datetime", "lastPing"),
      attribute("string", "userAgent", { size: 500 }),
    ],
    indexes: [
      { key: "sessionId_unique", type: "Unique", columns: ["sessionId"] },
    ],
  },
  {
    id: "user_history",
    name: "User History",
    permissions: [sdk.Permission.create("users")],
    documentSecurity: true,
    attributes: [
      attribute("string", "userId", { required: true, size: 64 }),
      attribute("string", "naatId", { required: true, size: 64 }),
      attribute("integer", "watchedAt", { required: true, min: 0 }),
      attribute("boolean", "isRemoved", { required: true }),
      attribute("datetime", "clientUpdatedAt", { required: true }),
      attribute("string", "deviceId", { required: true, size: 64 }),
      attribute("datetime", "updatedAt", { required: false }),
    ],
    indexes: [
      { key: "user_naat_idx", type: "Key", columns: ["userId", "naatId"] },
      { key: "user_updated_idx", type: "Key", columns: ["userId", "clientUpdatedAt"] },
    ],
  },
];

const bucketSpecs = [
  { id: config.buckets.audio, name: "Audio Files" },
  { id: config.buckets.cutAudio, name: "Cut Audio Files" },
];

const tableSpecs = [
  {
    id: config.collections.voiceVariantsTable,
    name: "Voice Variants",
    columns: [
      { key: "sourceAudioId", size: 64, required: true },
      { key: "voicePreset", size: 32, required: true },
      { key: "status", size: 32, required: true },
      { key: "jobId", size: 64, required: true },
      { key: "error", size: 2000, required: false },
      { key: "outputAudioId", size: 64, required: false },
    ],
    indexes: [
      { key: "source_preset_idx", columns: ["sourceAudioId", "voicePreset"] },
      { key: "status_idx", columns: ["status"] },
    ],
  },
];

function printPlan() {
  console.log(`${apply ? "APPLY" : "DRY RUN"} — Appwrite provisioning`);
  console.log(`Brand:    ${projectId}`);
  console.log(`Endpoint: ${config.endpoint}`);
  console.log(`Project:  ${config.projectId}`);
  console.log(`Database: ${config.databaseId}`);
  console.log("Resources: database, 7 collections (schema + indexes), 1 table, 2 storage buckets");
  if (!apply) console.log("No changes made. Add --apply to provision missing resources.");
  console.log("");
}

async function ensureDatabase() {
  try {
    await databases.get(config.databaseId);
    console.log(`= database ${config.databaseId}`);
  } catch (error) {
    if (error.code !== 404) throw error;
    if (apply) {
      try {
        await databases.create(config.databaseId, `${brand.app?.name || projectId} Database`, true);
        console.log(`+ database ${config.databaseId}`);
      } catch (err) {
        if (err.code !== 409) throw err;
        console.log(`= database ${config.databaseId}`);
      }
    } else {
      console.log(`+ database ${config.databaseId} (planned)`);
    }
  }
}

async function ensureCollection(spec) {
  try {
    await databases.getCollection(config.databaseId, spec.id);
    console.log(`= collection ${spec.id}`);
  } catch (error) {
    if (error.code !== 404) throw error;
    if (apply) {
      try {
        await databases.createCollection(
          config.databaseId,
          spec.id,
          spec.name,
          spec.permissions,
          spec.documentSecurity ?? false,
          true,
        );
      } catch (err) {
        try {
          await databases.createCollection(
            config.databaseId,
            spec.id,
            spec.name,
            spec.permissions,
            spec.documentSecurity ?? false,
          );
        } catch (err2) {
          if (err2.code !== 409) throw err2;
        }
      }
      console.log(`+ collection ${spec.id}`);
    } else {
      console.log(`+ collection ${spec.id} (planned)`);
    }
  }

  if (!apply) {
    for (const attr of spec.attributes) console.log(`  + ${attr.type} ${attr.key} (planned)`);
    for (const index of spec.indexes) console.log(`  + index ${index.key} (planned)`);
    return;
  }

  for (const attr of spec.attributes) await ensureAttribute(spec.id, attr);
  for (const index of spec.indexes) await ensureIndex(spec.id, index);
}

function createAttribute(collectionId, attr) {
  const params = {
    databaseId: config.databaseId,
    collectionId,
    key: attr.key,
    required: attr.required || false,
  };
  if (attr.default !== undefined) params.default = attr.default;
  if (attr.xdefault !== undefined) params.xdefault = attr.xdefault;
  if (attr.size !== undefined) params.size = attr.size;
  if (attr.min !== undefined) params.min = attr.min;
  if (attr.max !== undefined) params.max = attr.max;

  const method = {
    string: "createStringAttribute",
    integer: "createIntegerAttribute",
    float: "createFloatAttribute",
    boolean: "createBooleanAttribute",
    datetime: "createDatetimeAttribute",
  }[attr.type];
  if (!method) throw new Error(`Unsupported attribute type '${attr.type}'`);
  return databases[method](params);
}

async function ensureAttribute(collectionId, attr) {
  const collection = await databases.getCollection(config.databaseId, collectionId);
  const existing = collection.attributes?.find((item) => item.key === attr.key);
  if (existing) {
    const expectedType = attr.type === "float" ? "double" : attr.type;
    if (existing.type !== expectedType) {
      console.log(`! schema mismatch: ${collectionId}.${attr.key} is ${existing.type}, expected ${expectedType} (skipping)`);
      return;
    }
    return;
  }

  try {
    await createAttribute(collectionId, attr);
    console.log(`  + ${attr.type} ${attr.key}`);
  } catch (error) {
    if (error.code === 409) return;
    throw error;
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const refreshed = await databases.getCollection(config.databaseId, collectionId);
    const current = refreshed.attributes?.find((item) => item.key === attr.key);
    if (current?.status === "available") return;
    if (current?.status === "failed") {
      console.log(`! attribute ${collectionId}.${attr.key} failed (skipping)`);
      return;
    }
    await wait(1500);
  }
  console.log(`! timed out waiting for ${collectionId}.${attr.key} (skipping)`);
}

async function ensureIndex(collectionId, index) {
  const collection = await databases.getCollection(config.databaseId, collectionId);
  if (collection.indexes?.some((item) => item.key === index.key)) return;
  try {
    await databases.createIndex(
      config.databaseId,
      collectionId,
      index.key,
      sdk.IndexType[index.type] || sdk.IndexType.Key,
      index.columns || index.attributes || [],
      index.orders || [],
    );
    console.log(`  + index ${index.key}`);
  } catch (error) {
    if (error.code === 409) return;
    // Ignore index errors to be compatible across projects
    console.log(`! index ${index.key} skipped: ${error.message}`);
  }
}

async function ensureBucket(spec) {
  try {
    await storage.getBucket(spec.id);
    console.log(`= bucket ${spec.id}`);
  } catch (error) {
    if (error.code !== 404) throw error;
    if (!apply) {
      console.log(`+ bucket ${spec.id} (planned)`);
      return;
    }
    try {
      await storage.createBucket(
        spec.id,
        spec.name,
        publicRead,
        false,
        true,
        100 * 1024 * 1024,
        ["m4a", "mp4", "mpeg", "mp3", "aac", "wav"],
        sdk.Compression.None,
        false,
        true,
      );
      console.log(`+ bucket ${spec.id}`);
    } catch (err) {
      if (err.code !== 409) throw err;
      console.log(`= bucket ${spec.id}`);
    }
  }
}

async function ensureTable(spec) {
  try {
    await tablesDB.getTable({ databaseId: config.databaseId, tableId: spec.id });
    console.log(`= table ${spec.id}`);
  } catch (error) {
    if (error.code !== 404) throw error;
    if (!apply) {
      console.log(`+ table ${spec.id} (planned)`);
      return;
    }
    try {
      await tablesDB.createTable({
        databaseId: config.databaseId,
        tableId: spec.id,
        name: spec.name,
        permissions: noPermissions,
        rowSecurity: false,
        enabled: true,
      });
      console.log(`+ table ${spec.id}`);
    } catch (err) {
      if (err.code !== 409) throw err;
      console.log(`= table ${spec.id}`);
    }
  }

  if (!apply) return;
  for (const column of spec.columns) {
    try {
      const table = await tablesDB.getTable({ databaseId: config.databaseId, tableId: spec.id });
      const existing = table.columns?.find((item) => item.key === column.key);
      if (existing) continue;
      await tablesDB.createStringColumn({
        databaseId: config.databaseId,
        tableId: spec.id,
        key: column.key,
        size: column.size,
        required: column.required || false,
      });
      console.log(`  + string ${column.key}`);
      await wait(1500);
    } catch (error) {
      if (error.code !== 409) console.log(`! column ${column.key} skipped`);
    }
  }
}

async function main() {
  printPlan();
  if (!apply) return;

  await ensureDatabase();
  for (const collection of collectionSpecs) await ensureCollection(collection);
  for (const table of tableSpecs) await ensureTable(table);
  for (const bucket of bucketSpecs) await ensureBucket(bucket);

  console.log("\nProvisioning complete.");
}

main().catch((error) => {
  console.error(`\nProvisioning failed: ${error.message || error}`);
  process.exit(1);
});
