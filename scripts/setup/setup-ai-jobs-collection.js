require("dotenv").config({ path: "apps/mobile/.env" });
const sdk = require("node-appwrite");

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || "",
  projectId: process.env.APPWRITE_PROJECT_ID || "",
  apiKey: process.env.APPWRITE_API_KEY || "",
  databaseId: process.env.APPWRITE_DATABASE_ID || "",
  collectionId: process.env.APPWRITE_AI_JOBS_COLLECTION_ID || "ai_jobs",
};

function validateConfig() {
  const missing = [];
  if (!config.endpoint) missing.push("APPWRITE_ENDPOINT");
  if (!config.projectId) missing.push("APPWRITE_PROJECT_ID");
  if (!config.apiKey) missing.push("APPWRITE_API_KEY");
  if (!config.databaseId) missing.push("APPWRITE_DATABASE_ID");

  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    missing.forEach((value) => console.error(`- ${value}`));
    process.exit(1);
  }
}

function createDatabasesClient() {
  const client = new sdk.Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  return new sdk.Databases(client);
}

async function waitForAttribute(databases, attributeKey) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const collection = await databases.getCollection(
      config.databaseId,
      config.collectionId,
    );
    const attribute = collection.attributes.find((item) => item.key === attributeKey);

    if (attribute?.status === "available") return;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Attribute '${attributeKey}' did not become available in time`);
}

async function ensureCollection(databases) {
  try {
    await databases.getCollection(config.databaseId, config.collectionId);
    console.log(`Collection '${config.collectionId}' already exists.`);
  } catch (error) {
    if (error.code !== 404) throw error;

    await databases.createCollection(
      config.databaseId,
      config.collectionId,
      "AI Jobs",
      [],
      false,
    );
    console.log(`Created collection '${config.collectionId}'.`);
  }
}

async function ensureAttribute(databases, key, create) {
  try {
    await create();
    console.log(`Created attribute '${key}'.`);
    await waitForAttribute(databases, key);
  } catch (error) {
    if (error.code === 409) {
      console.log(`Attribute '${key}' already exists.`);
      return;
    }

    throw error;
  }
}

async function ensureIndex(databases, key, type, attributes, orders = []) {
  try {
    await databases.createIndex(
      config.databaseId,
      config.collectionId,
      key,
      type,
      attributes,
      orders,
    );
    console.log(`Created index '${key}'.`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`Index '${key}' already exists.`);
      return;
    }

    throw error;
  }
}

async function main() {
  validateConfig();
  const databases = createDatabasesClient();

  await ensureCollection(databases);

  await ensureAttribute(databases, "type", () =>
    databases.createStringAttribute(config.databaseId, config.collectionId, "type", 64, true),
  );
  await ensureAttribute(databases, "naatId", () =>
    databases.createStringAttribute(config.databaseId, config.collectionId, "naatId", 64, true),
  );
  await ensureAttribute(databases, "audioId", () =>
    databases.createStringAttribute(config.databaseId, config.collectionId, "audioId", 64, true),
  );
  await ensureAttribute(databases, "status", () =>
    databases.createStringAttribute(config.databaseId, config.collectionId, "status", 32, true),
  );
  await ensureAttribute(databases, "progress", () =>
    databases.createIntegerAttribute(config.databaseId, config.collectionId, "progress", false, 0, 100, 0),
  );
  await ensureAttribute(databases, "attempts", () =>
    databases.createIntegerAttribute(config.databaseId, config.collectionId, "attempts", false, 0, undefined, 0),
  );
  await ensureAttribute(databases, "workerId", () =>
    databases.createStringAttribute(config.databaseId, config.collectionId, "workerId", 128, false),
  );
  await ensureAttribute(databases, "leaseUntil", () =>
    databases.createDatetimeAttribute(config.databaseId, config.collectionId, "leaseUntil", false),
  );
  await ensureAttribute(databases, "error", () =>
    databases.createStringAttribute(config.databaseId, config.collectionId, "error", 5000, false),
  );
  await ensureAttribute(databases, "resultJson", () =>
    databases.createStringAttribute(config.databaseId, config.collectionId, "resultJson", 50000, false),
  );
  await ensureAttribute(databases, "startedAt", () =>
    databases.createDatetimeAttribute(config.databaseId, config.collectionId, "startedAt", false),
  );
  await ensureAttribute(databases, "finishedAt", () =>
    databases.createDatetimeAttribute(config.databaseId, config.collectionId, "finishedAt", false),
  );

  await ensureIndex(databases, "type_status_created", sdk.IndexType.Key, ["type", "status", "$createdAt"], ["ASC", "ASC", "ASC"]);
  await ensureIndex(databases, "naatId_idx", sdk.IndexType.Key, ["naatId"], ["ASC"]);
  await ensureIndex(databases, "status_lease_idx", sdk.IndexType.Key, ["status", "leaseUntil"], ["ASC", "ASC"]);

  console.log("");
  console.log("AI jobs collection is ready.");
  console.log(`Collection ID: ${config.collectionId}`);
  console.log("Set these env vars where needed:");
  console.log(`- APPWRITE_AI_JOBS_COLLECTION_ID=${config.collectionId}`);
  console.log(`- NEXT_PUBLIC_APPWRITE_AI_JOBS_COLLECTION_ID=${config.collectionId}`);
}

main().catch((error) => {
  console.error("Failed to set up AI jobs collection:", error.message || error);
  process.exit(1);
});
