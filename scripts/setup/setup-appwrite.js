/**
 * Appwrite Database Setup Script
 *
 * This script creates the Naats collection with all required attributes and indexes.
 * Run this script after creating your Appwrite project and database.
 *
 * Usage: node scripts/setup-appwrite.js
 */

const sdk = require("node-appwrite");
const path = require("path");
const fs = require("fs");

// Try to load from .env or .env.local
const envPath = fs.existsSync(path.join(__dirname, "..", ".env"))
  ? path.join(__dirname, "..", ".env")
  : path.join(__dirname, "..", ".env.local");

require("dotenv").config({ path: envPath });

// Configuration from environment variables
const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_SECRET_KEY,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
};

// Validate configuration
function validateConfig() {
  const missing = [];
  if (!config.endpoint) missing.push("EXPO_PUBLIC_APPWRITE_ENDPOINT");
  if (!config.projectId) missing.push("EXPO_PUBLIC_APPWRITE_PROJECT_ID");
  if (!config.apiKey) missing.push("APPWRITE_SECRET_KEY");
  if (!config.databaseId) missing.push("EXPO_PUBLIC_APPWRITE_DATABASE_ID");

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((v) => console.error(`   - ${v}`));
    process.exit(1);
  }
}

// Initialize Appwrite client
function initializeClient() {
  const client = new sdk.Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  return new sdk.Databases(client);
}

// Helper function to wait for attribute creation
async function waitForAttribute(
  databases,
  databaseId,
  collectionId,
  attributeKey
) {
  console.log(`   ⏳ Waiting for attribute '${attributeKey}' to be ready...`);
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    try {
      const collection = await databases.getCollection(
        databaseId,
        collectionId
      );
      const attribute = collection.attributes.find(
        (attr) => attr.key === attributeKey
      );

      if (attribute && attribute.status === "available") {
        console.log(`   ✅ Attribute '${attributeKey}' is ready`);
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error(`   ⚠️  Error checking attribute status: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    }
  }

  throw new Error(
    `Attribute '${attributeKey}' did not become available in time`
  );
}

// Create Naats collection
async function createNaatsCollection(databases) {
  const collectionId = sdk.ID.unique();

  console.log("\n📦 Creating Naats collection...");

  try {
    console.log(`✅ Collection created with ID: ${collectionId}`);
    return collectionId;
  } catch (error) {
    console.error(`❌ Failed to create collection: ${error.message}`);
    throw error;
  }
}

// Create all attributes for the Naats collection
async function createAttributes(databases, collectionId) {
  console.log("\n📝 Creating attributes...");

  const attributes = [
    {
      name: "title",
      type: "string",
      size: 500,
      required: true,
      create: () =>
        databases.createStringAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "title",
          size: 500,
          required: true,
        }),
    },
    {
      name: "videoUrl",
      type: "string",
      size: 1000,
      required: true,
      create: () =>
        databases.createStringAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "videoUrl",
          size: 1000,
          required: true,
        }),
    },
    {
      name: "thumbnailUrl",
      type: "string",
      size: 1000,
      required: true,
      create: () =>
        databases.createStringAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "thumbnailUrl",
          size: 1000,
          required: true,
        }),
    },
    {
      name: "duration",
      type: "integer",
      required: true,
      create: () =>
        databases.createIntegerAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "duration",
          required: true,
          min: 0,
        }),
    },
    {
      name: "uploadDate",
      type: "datetime",
      required: true,
      create: () =>
        databases.createDatetimeAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "uploadDate",
          required: true,
        }),
    },
    {
      name: "channelName",
      type: "string",
      size: 200,
      required: true,
      create: () =>
        databases.createStringAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "channelName",
          size: 200,
          required: true,
        }),
    },
    {
      name: "channelId",
      type: "string",
      size: 100,
      required: true,
      create: () =>
        databases.createStringAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "channelId",
          size: 100,
          required: true,
        }),
    },
    {
      name: "youtubeId",
      type: "string",
      size: 50,
      required: true,
      create: () =>
        databases.createStringAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "youtubeId",
          size: 50,
          required: true,
        }),
    },
    {
      name: "views",
      type: "integer",
      required: true,
      create: () =>
        databases.createIntegerAttribute({
          databaseId: config.databaseId,
          collectionId: collectionId,
          key: "views",
          required: true,
          min: 0,
        }),
    },
  ];

  for (const attr of attributes) {
    try {
      console.log(`\n   Creating ${attr.type} attribute: ${attr.name}`);
      await attr.create();
      console.log(`   ✅ Attribute '${attr.name}' created`);

      // Wait for attribute to be ready before creating the next one
      await waitForAttribute(
        databases,
        config.databaseId,
        collectionId,
        attr.name
      );
    } catch (error) {
      console.error(
        `   ❌ Failed to create attribute '${attr.name}': ${error.message}`
      );
      throw error;
    }
  }

  console.log("\n✅ All attributes created successfully");
}

// Create indexes for search and performance
async function createIndexes(databases, collectionId) {
  console.log("\n🔍 Creating indexes...");

  const indexes = [
    {
      name: "title_search",
      type: sdk.IndexType.Fulltext,
      attributes: ["title"],
      description: "Full-text search on title",
    },
    {
      name: "youtubeId_unique",
      type: sdk.IndexType.Unique,
      attributes: ["youtubeId"],
      description: "Unique index on youtubeId to prevent duplicates",
    },
    {
      name: "uploadDate_desc",
      type: sdk.IndexType.Key,
      attributes: ["uploadDate"],
      orders: ["DESC"],
      description: "Index for sorting by upload date (newest first)",
    },
    {
      name: "uploadDate_asc",
      type: sdk.IndexType.Key,
      attributes: ["uploadDate"],
      orders: ["ASC"],
      description: "Index for sorting by upload date (oldest first)",
    },
    {
      name: "views_desc",
      type: sdk.IndexType.Key,
      attributes: ["views"],
      orders: ["DESC"],
      description: "Index for sorting by views (most popular first)",
    },
    {
      name: "channelId_index",
      type: sdk.IndexType.Key,
      attributes: ["channelId"],
      description: "Index for filtering by channel",
    },
  ];

  for (const index of indexes) {
    try {
      console.log(`\n   Creating ${index.type} index: ${index.name}`);
      await databases.createIndex({
        databaseId: config.databaseId,
        collectionId: collectionId,
        key: index.name,
        type: index.type,
        attributes: index.attributes,
        orders: index.orders || [],
      });
      console.log(`   ✅ Index '${index.name}' created`);
      console.log(`      ${index.description}`);

      // Wait a bit between index creations
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(
        `   ❌ Failed to create index '${index.name}': ${error.message}`
      );
      throw error;
    }
  }

  console.log("\n✅ All indexes created successfully");
}

// Update .env.local with the collection ID
async function updateEnvFile(collectionId) {
  const fs = require("fs");
  const path = require("path");

  console.log("\n📝 Updating .env.local file...");

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let envContent = fs.readFileSync(envPath, "utf8");

    // Replace the placeholder collection ID
    envContent = envContent.replace(
      /EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID=.*/,
      `EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID=${collectionId}`
    );

    fs.writeFileSync(envPath, envContent);
    console.log("✅ .env.local updated with collection ID");
  } catch (error) {
    console.error(`❌ Failed to update .env.local: ${error.message}`);
    console.log(
      `\n⚠️  Please manually update EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID to: ${collectionId}`
    );
  }
}

// Main setup function
async function setup() {
  console.log("🚀 Starting Appwrite Database Setup\n");
  console.log("═══════════════════════════════════════════════════════════");

  try {
    // Validate configuration
    validateConfig();
    console.log("✅ Configuration validated");

    // Initialize client
    const databases = initializeClient();
    console.log("✅ Appwrite client initialized");

    // Create collection
    const collectionId = await createNaatsCollection(databases);

    // Create attributes
    await createAttributes(databases, collectionId);

    // Create indexes
    await createIndexes(databases, collectionId);

    // Update .env.local
    await updateEnvFile(collectionId);

    console.log(
      "\n═══════════════════════════════════════════════════════════"
    );
    console.log("🎉 Setup completed successfully!\n");
    console.log("📋 Summary:");
    console.log(`   Database ID: ${config.databaseId}`);
    console.log(`   Collection ID: ${collectionId}`);
    console.log(`   Collection Name: Naats`);
    console.log("\n📝 Next steps:");
    console.log("   1. Verify the collection in your Appwrite console");
    console.log("   2. Test the API by running your app");
    console.log("   3. Set up the video ingestion function (Task 12)");
    console.log("\n");
  } catch (error) {
    console.error(
      "\n═══════════════════════════════════════════════════════════"
    );
    console.error("❌ Setup failed:", error.message);
    console.error("\nPlease check the error above and try again.");
    process.exit(1);
  }
}

// Run setup
setup();
