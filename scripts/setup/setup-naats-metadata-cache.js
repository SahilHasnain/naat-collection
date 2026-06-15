/**
 * Appwrite Naats Metadata Cache Collection Setup Script
 *
 * Creates a single-document cache collection used by For You and Search
 * to avoid fetching thousands of full naat documents per user.
 *
 * Usage: node scripts/setup/setup-naats-metadata-cache.js
 */

const sdk = require("node-appwrite");
const path = require("path");

const envPath = path.join(__dirname, "..", "..", "apps", "mobile", ".env");
require("dotenv").config({ path: envPath });

const COLLECTION_ID = "naats-metadata-cache";

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
};

function validateConfig() {
  const missing = [];
  if (!config.endpoint) missing.push("APPWRITE_ENDPOINT");
  if (!config.projectId) missing.push("APPWRITE_PROJECT_ID");
  if (!config.apiKey) missing.push("APPWRITE_API_KEY");
  if (!config.databaseId) missing.push("APPWRITE_DATABASE_ID");

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((v) => console.error(`   - ${v}`));
    process.exit(1);
  }
}

async function waitForAttribute(databases, attributeKey) {
  console.log(`   ⏳ Waiting for attribute '${attributeKey}' to be ready...`);
  let attempts = 0;

  while (attempts < 30) {
    const collection = await databases.getCollection(
      config.databaseId,
      COLLECTION_ID,
    );
    const attribute = collection.attributes.find(
      (attr) => attr.key === attributeKey,
    );

    if (attribute && attribute.status === "available") {
      console.log(`   ✅ Attribute '${attributeKey}' is ready`);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error(`Attribute '${attributeKey}' did not become available in time`);
}

async function setupCache() {
  validateConfig();

  const client = new sdk.Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  const databases = new sdk.Databases(client);

  try {
    console.log("Creating naats-metadata-cache collection...");

    try {
      await databases.getCollection(config.databaseId, COLLECTION_ID);
      console.log(`✅ Collection '${COLLECTION_ID}' already exists`);
    } catch {
      await databases.createCollection({
        databaseId: config.databaseId,
        collectionId: COLLECTION_ID,
        name: "Naats Metadata Cache",
        permissions: [sdk.Permission.read(sdk.Role.any())],
        documentSecurity: false,
      });
      console.log(`✅ Collection created: ${COLLECTION_ID}`);
    }

    const collection = await databases.getCollection(
      config.databaseId,
      COLLECTION_ID,
    );
    const existingKeys = new Set(collection.attributes.map((attr) => attr.key));

    if (!existingKeys.has("metadata")) {
      await databases.createStringAttribute({
        databaseId: config.databaseId,
        collectionId: COLLECTION_ID,
        key: "metadata",
        size: 10000000,
        required: true,
      });
      await waitForAttribute(databases, "metadata");
    }

    if (!existingKeys.has("updatedAt")) {
      await databases.createStringAttribute({
        databaseId: config.databaseId,
        collectionId: COLLECTION_ID,
        key: "updatedAt",
        size: 50,
        required: true,
      });
      await waitForAttribute(databases, "updatedAt");
    }

    if (!existingKeys.has("totalCount")) {
      await databases.createIntegerAttribute({
        databaseId: config.databaseId,
        collectionId: COLLECTION_ID,
        key: "totalCount",
        required: true,
      });
      await waitForAttribute(databases, "totalCount");
    }

    console.log("✅ Setup complete!");
    console.log(
      "Next: deploy sync-naats-metadata function and run first sync to populate cache.",
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

setupCache();
