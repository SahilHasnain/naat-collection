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

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npm run provision:appwrite -- --project <brand>${"\n"}`);
  console.log("Add --apply to create missing resources; without it, this is a dry run.");
  console.log(`Available projects: ${projectIds.join(", ")}`);
  process.exit(0);
}

if (!projectId) {
  console.error("Choose a brand explicitly with --project <brand>.");
  console.error(`Available projects: ${projectIds.join(", ")}`);
  process.exit(2);
}

let brand;
try {
  brand = getProject(projectId);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

// Load only files associated with the selected brand. Existing shell/CI env
// values take precedence over dotenv files.
for (const envFile of [
  path.resolve(`.env.${projectId}`),
  path.resolve(`apps/mobile/.env.${projectId}`),
]) {
  dotenv.config({ path: envFile });
}

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || brand.appwrite.endpoint,
  projectId: process.env.APPWRITE_PROJECT_ID || brand.appwrite.projectId,
  databaseId: process.env.APPWRITE_DATABASE_ID || brand.appwrite.databaseId,
  apiKey: process.env.APPWRITE_API_KEY || process.env.APPWRITE_SECRET_KEY,
  collections: {
    naats: process.env.APPWRITE_NAATS_COLLECTION_ID || brand.appwrite.naatsCollectionId,
    channels: process.env.APPWRITE_CHANNELS_COLLECTION_ID || brand.appwrite.channelsCollectionId,
    audioCache: process.env.APPWRITE_AUDIO_CACHE_COLLECTION_ID || brand.appwrite.audioCacheCollectionId,
    aiJobs: process.env.APPWRITE_AI_JOBS_COLLECTION_ID || brand.appwrite.aiJobsCollectionId || "ai_jobs",
    voiceVariantsTable: process.env.APPWRITE_VOICE_VARIANTS_TABLE_ID || "voice_variants",
    liveRadio: process.env.APPWRITE_LIVE_RADIO_COLLECTION_ID || brand.appwrite.liveRadioCollectionId,
    liveRadioListeners:
      process.env.APPWRITE_LIVE_RADIO_LISTENERS_COLLECTION_ID || "live_radio_listeners",
  },
  buckets: {
    audio: process.env.APPWRITE_AUDIO_BUCKET_ID || "audio-files",
    cutAudio: process.env.APPWRITE_CUT_AUDIO_BUCKET_ID || "cut-audio-files",
  },
};

const required = ["endpoint", "projectId", "databaseId"];
const missing = required.filter((key) => !config[key]);
if (apply && !config.apiKey) missing.push("APPWRITE_API_KEY");
if (missing.length) {
  console.error(`Missing provisioning configuration: ${missing.join(", ")}`);
  process.exit(2);
}

const client = new sdk.Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);
const databases = new sdk.Databases(client);
const storage = new sdk.Storage(client);
const tablesDB = new sdk.TablesDB(client);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const publicRead = [sdk.Permission.read(sdk.Role.any())];
const noPermissions = [];

function attribute(type, key, options = {}) {
  return { type, key, ...options };
}

const collectionSpecs = [
  {
    id: config.collections.naats,
    name: "Naats",
    permissions: publicRead,
    attributes: [
      attribute("string", "title", { size: 500, required: true }),
      attribute("string", "videoUrl", { size: 1000, required: true }),
      attribute("string", "thumbnailUrl", { size: 1000, required: true }),
      attribute("integer", "duration", { required: true, min: 0 }),
      attribute("datetime", "uploadDate", { required: true }),
      attribute("string", "channelName", { size: 200, required: true }),
      attribute("string", "channelId", { size: 100, required: true }),
      attribute("string", "youtubeId", { size: 50, required: true }),
      attribute("integer", "views", { required: true, min: 0 }),
      attribute("string", "audioId", { size: 100 }),
      attribute("string", "cutAudio", { size: 100 }),
      attribute("boolean", "best", { xdefault: false }),
      attribute("boolean", "exclude", { xdefault: false }),
      attribute("boolean", "isRadio", { xdefault: false }),
      attribute("boolean", "excludeFromAI", { xdefault: false }),
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
      { key: "title_search", type: "Fulltext", attributes: ["title"] },
      { key: "youtubeId_unique", type: "Unique", attributes: ["youtubeId"] },
      { key: "uploadDate_desc", type: "Key", attributes: ["uploadDate"], orders: ["DESC"] },
      { key: "uploadDate_asc", type: "Key", attributes: ["uploadDate"], orders: ["ASC"] },
      { key: "views_desc", type: "Key", attributes: ["views"], orders: ["DESC"] },
      { key: "channelId_idx", type: "Key", attributes: ["channelId"] },
      { key: "best_idx", type: "Key", attributes: ["best"] },
    ],
  },
  {
    id: config.collections.channels,
    name: "Channels",
    permissions: publicRead,
    attributes: [
      attribute("string", "channelId", { size: 255, required: true }),
      attribute("string", "channelName", { size: 255, required: true }),
      attribute("integer", "naatCount", { min: 0, xdefault: 0 }),
      attribute("datetime", "lastUpdated"),
      attribute("boolean", "isOther", { xdefault: false }),
      attribute("string", "type", { size: 20, xdefault: "channel" }),
      attribute("string", "playlistId", { size: 255 }),
      attribute("integer", "maxDuration", { min: 1 }),
    ],
    indexes: [
      { key: "channelId_unique", type: "Unique", attributes: ["channelId"] },
      { key: "channelName_index", type: "Key", attributes: ["channelName"], orders: ["ASC"] },
    ],
  },
  {
    id: config.collections.audioCache,
    name: "Audio Cache",
    permissions: noPermissions,
    attributes: [
      attribute("string", "youtubeId", { size: 50, required: true }),
      attribute("string", "audioUrl", { size: 2000, required: true }),
      attribute("datetime", "expiresAt", { required: true }),
      attribute("string", "quality", { size: 50 }),
      attribute("datetime", "fetchedAt", { required: true }),
      attribute("string", "title", { size: 500 }),
      attribute("integer", "duration", { min: 0 }),
    ],
    indexes: [
      { key: "youtubeId_unique", type: "Unique", attributes: ["youtubeId"] },
      { key: "expiresAt_asc", type: "Key", attributes: ["expiresAt"], orders: ["ASC"] },
      { key: "fetchedAt_desc", type: "Key", attributes: ["fetchedAt"], orders: ["DESC"] },
    ],
  },
  {
    id: config.collections.aiJobs,
    name: "AI Jobs",
    permissions: noPermissions,
    attributes: [
      attribute("string", "type", { size: 64, required: true }),
      attribute("string", "naatId", { size: 64, required: true }),
      attribute("string", "audioId", { size: 64, required: true }),
      attribute("string", "status", { size: 32, required: true }),
      attribute("integer", "progress", { min: 0, max: 100, xdefault: 0 }),
      attribute("integer", "attempts", { min: 0, xdefault: 0 }),
      attribute("string", "workerId", { size: 128 }),
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
      { key: "type_status_created", type: "Key", attributes: ["type", "status", "$createdAt"], orders: ["ASC", "ASC", "ASC"] },
      { key: "naatId_idx", type: "Key", attributes: ["naatId"], orders: ["ASC"] },
      { key: "status_lease_idx", type: "Key", attributes: ["status", "leaseUntil"], orders: ["ASC", "ASC"] },
    ],
  },
  {
    id: config.collections.liveRadio,
    name: "Live Radio",
    permissions: publicRead,
    attributes: [
      attribute("boolean", "isLive", { xdefault: false }),
      attribute("string", "currentNaatId", { size: 100 }),
      attribute("datetime", "startedAt"),
      attribute("integer", "listenerCount", { min: 0, xdefault: 0 }),
    ],
    indexes: [],
  },
  {
    id: config.collections.liveRadioListeners,
    name: "Live Radio Listeners",
    permissions: noPermissions,
    attributes: [
      attribute("string", "sessionId", { size: 100, required: true }),
      attribute("datetime", "connectedAt", { required: true }),
      attribute("datetime", "lastPing"),
      attribute("string", "userAgent", { size: 500 }),
    ],
    indexes: [
      { key: "sessionId_unique", type: "Unique", attributes: ["sessionId"] },
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
      { key: "error", size: 2000, required: false, xdefault: "" },
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
  console.log("Resources: database, 6 collections (schema + indexes), 1 table, 2 storage buckets");
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
      await databases.create(config.databaseId, `${brand.app.name} Database`, true);
      console.log(`+ database ${config.databaseId}`);
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
      await databases.createCollection(
        config.databaseId,
        spec.id,
        spec.name,
        spec.permissions,
        false,
      );
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
    ...(attr.xdefault !== undefined ? { xdefault: attr.xdefault } : {}),
  };
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
  const existing = collection.attributes.find((item) => item.key === attr.key);
  if (existing) {
    // Appwrite represents SDK-created Float attributes as `double` in the
    // collection schema response.
    const expectedType = attr.type === "float" ? "double" : attr.type;
    if (existing.type !== expectedType) {
      throw new Error(
        `Schema mismatch: ${collectionId}.${attr.key} is ${existing.type}, expected ${expectedType}`,
      );
    }
    return;
  }

  try {
    await createAttribute(collectionId, attr);
    console.log(`  + ${attr.type} ${attr.key}`);
  } catch (error) {
    if (error.code !== 409) throw error;
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const refreshed = await databases.getCollection(config.databaseId, collectionId);
    const current = refreshed.attributes.find((item) => item.key === attr.key);
    if (current?.status === "available") return;
    if (current?.status === "failed") {
      throw new Error(`Attribute ${collectionId}.${attr.key} failed to provision`);
    }
    await wait(1500);
  }
  throw new Error(`Timed out waiting for ${collectionId}.${attr.key}`);
}

async function ensureIndex(collectionId, index) {
  const collection = await databases.getCollection(config.databaseId, collectionId);
  if (collection.indexes.some((item) => item.key === index.key)) return;
  try {
    await databases.createIndex(
      config.databaseId,
      collectionId,
      index.key,
      sdk.IndexType[index.type],
      index.attributes,
      index.orders || [],
    );
    console.log(`  + index ${index.key}`);
  } catch (error) {
    if (error.code !== 409) throw error;
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
    await storage.createBucket(
      spec.id,
      spec.name,
      publicRead,
      false, // fileSecurity: API-key workers manage file access
      true,
      100 * 1024 * 1024,
      ["m4a", "mp4", "mpeg", "mp3", "aac", "wav"],
      sdk.Compression.None,
      false,
      true,
    );
    console.log(`+ bucket ${spec.id}`);
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
      for (const column of spec.columns) console.log(`  + string ${column.key} (planned)`);
      for (const index of spec.indexes) console.log(`  + index ${index.key} (planned)`);
      return;
    }
    await tablesDB.createTable({
      databaseId: config.databaseId,
      tableId: spec.id,
      name: spec.name,
      permissions: noPermissions,
      rowSecurity: false,
      enabled: true,
    });
    console.log(`+ table ${spec.id}`);
  }

  if (!apply) {
    for (const column of spec.columns) console.log(`  + string ${column.key} (planned)`);
    for (const index of spec.indexes) console.log(`  + index ${index.key} (planned)`);
    return;
  }

  for (const column of spec.columns) {
    const table = await tablesDB.getTable({ databaseId: config.databaseId, tableId: spec.id });
    const existing = table.columns.find((item) => item.key === column.key);
    if (existing) {
      if (existing.type !== "string") {
        throw new Error(`Schema mismatch: ${spec.id}.${column.key} is ${existing.type}, expected string`);
      }
      continue;
    }

    try {
      await tablesDB.createStringColumn({
        databaseId: config.databaseId,
        tableId: spec.id,
        ...column,
      });
      console.log(`  + string ${column.key}`);
    } catch (error) {
      if (error.code !== 409) throw error;
    }

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const refreshed = await tablesDB.getTable({ databaseId: config.databaseId, tableId: spec.id });
      const current = refreshed.columns.find((item) => item.key === column.key);
      if (current?.status === "available") break;
      if (current?.status === "failed") throw new Error(`Column ${spec.id}.${column.key} failed to provision`);
      await wait(1500);
      if (attempt === 39) throw new Error(`Timed out waiting for ${spec.id}.${column.key}`);
    }
  }

  for (const index of spec.indexes) {
    const table = await tablesDB.getTable({ databaseId: config.databaseId, tableId: spec.id });
    if (table.indexes.some((item) => item.key === index.key)) continue;
    try {
      await tablesDB.createIndex({
        databaseId: config.databaseId,
        tableId: spec.id,
        key: index.key,
        type: sdk.IndexType.Key,
        columns: index.columns,
      });
      console.log(`  + index ${index.key}`);
    } catch (error) {
      if (error.code !== 409) throw error;
    }
  }
}

async function main() {
  printPlan();
  const projectFromEnv = process.env.APPWRITE_PROJECT_ID;
  if (projectFromEnv && projectFromEnv !== config.projectId) {
    throw new Error(
      `APPWRITE_PROJECT_ID (${projectFromEnv}) does not match selected brand config (${config.projectId}). Refusing to target an ambiguous project.`,
    );
  }
  if (!apply) return;

  await ensureDatabase();
  for (const collection of collectionSpecs) await ensureCollection(collection);
  for (const table of tableSpecs) await ensureTable(table);
  for (const bucket of bucketSpecs) await ensureBucket(bucket);

  console.log("\nProvisioning complete. Existing resources were left intact.");
  console.log("\nResource IDs for Appwrite Function configuration:");
  console.log(`APPWRITE_DATABASE_ID=${config.databaseId}`);
  console.log(`APPWRITE_NAATS_COLLECTION_ID=${config.collections.naats}`);
  console.log(`APPWRITE_CHANNELS_COLLECTION_ID=${config.collections.channels}`);
  console.log(`APPWRITE_AUDIO_CACHE_COLLECTION_ID=${config.collections.audioCache}`);
  console.log(`APPWRITE_AI_JOBS_COLLECTION_ID=${config.collections.aiJobs}`);
  console.log(`APPWRITE_LIVE_RADIO_COLLECTION_ID=${config.collections.liveRadio}`);
  console.log(`APPWRITE_LIVE_RADIO_LISTENERS_COLLECTION_ID=${config.collections.liveRadioListeners}`);
  console.log(`APPWRITE_VOICE_VARIANTS_TABLE_ID=${config.collections.voiceVariantsTable}`);
  console.log(`APPWRITE_AUDIO_BUCKET_ID=${config.buckets.audio}`);
  console.log(`APPWRITE_CUT_AUDIO_BUCKET_ID=${config.buckets.cutAudio}`);
  console.log("Deploy Appwrite Functions separately and configure their environment variables/secrets.");
}

main().catch((error) => {
  console.error(`\nProvisioning failed: ${error.message || error}`);
  process.exit(1);
});
